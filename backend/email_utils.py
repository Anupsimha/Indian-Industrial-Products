"""
email_utils.py
--------------
Reusable Gmail SMTP email utility for the IIP platform.

Usage
-----
    from email_utils import send_email

    await send_email(
        to="user@example.com",
        subject="Your OTP",
        html_body="<p>Your OTP is <b>123456</b></p>",
    )

Configuration (read from environment / .env):
    SMTP_HOST       — default: smtp.gmail.com
    SMTP_PORT       — default: 587
    SMTP_USER       — Gmail address used for sending
    SMTP_PASSWORD   — Gmail App Password (16-char, spaces allowed)
    SMTP_FROM       — Friendly From header, e.g. "IIP Platform <iipplatform673@gmail.com>"
"""

from __future__ import annotations

import asyncio
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger("iip.email")


# ---------------------------------------------------------------------------
# Config helpers (resolved once at module import)
# ---------------------------------------------------------------------------

def _get_smtp_config() -> dict:
    return {
        "host": os.environ.get("SMTP_HOST", "smtp.gmail.com"),
        "port": int(os.environ.get("SMTP_PORT", 587)),
        "user": os.environ.get("SMTP_USER", ""),
        "password": os.environ.get("SMTP_PASSWORD", ""),
        "from_addr": os.environ.get("SMTP_FROM", os.environ.get("SMTP_USER", "")),
    }


# ---------------------------------------------------------------------------
# Core send function (synchronous — run in thread pool for async callers)
# ---------------------------------------------------------------------------

def _send_email_sync(
    to: str | list[str],
    subject: str,
    html_body: str,
    text_body: str | None = None,
) -> None:
    """
    Synchronous email sender. Raises on failure.
    Call via `send_email()` (async wrapper) from async code.
    """
    cfg = _get_smtp_config()
    recipients = [to] if isinstance(to, str) else list(to)

    if not cfg["user"] or not cfg["password"]:
        logger.warning(
            "\n" + "="*80 + "\n"
            "[MOCK EMAIL - SMTP NOT CONFIGED]\n"
            f"TO: {recipients}\n"
            f"SUBJECT: {subject}\n"
            f"BODY SUMMARY (STRIPPED TAGS):\n"
            f"{_html_to_plain(html_body)}\n"
            + "="*80 + "\n"
        )
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = cfg["from_addr"]
    msg["To"] = ", ".join(recipients)

    # Plain-text fallback
    plain = text_body or _html_to_plain(html_body)
    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    password = cfg["password"].replace(" ", "")
    if int(cfg["port"]) == 465:
        with smtplib.SMTP_SSL(cfg["host"], int(cfg["port"])) as server:
            server.login(cfg["user"], password)
            server.sendmail(cfg["from_addr"], recipients, msg.as_string())
    else:
        with smtplib.SMTP(cfg["host"], int(cfg["port"])) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(cfg["user"], password)
            server.sendmail(cfg["from_addr"], recipients, msg.as_string())

    logger.info("Email sent to %s — subject: %s", recipients, subject)


def _html_to_plain(html: str) -> str:
    """Very basic strip of HTML tags for plain-text fallback."""
    import re
    return re.sub(r"<[^>]+>", "", html).strip()


# ---------------------------------------------------------------------------
# Async wrapper (offloads blocking SMTP to thread pool)
# ---------------------------------------------------------------------------

async def send_email(
    to: str | list[str],
    subject: str,
    html_body: str,
    text_body: str | None = None,
) -> None:
    """
    Async email sender — safe to call from FastAPI route handlers.
    Runs the blocking SMTP call in a thread pool so the event loop is not blocked.
    """
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None,
        lambda: _send_email_sync(to, subject, html_body, text_body),
    )


# ---------------------------------------------------------------------------
# Pre-built template helpers
# ---------------------------------------------------------------------------

def build_otp_email(otp: str, user_name: str, action: str = "unlock a lead contact") -> str:
    """
    Returns a branded HTML email body for OTP confirmation.

    Parameters
    ----------
    otp       : 6-digit OTP string
    user_name : Recipient's display name
    action    : Short description of the action being confirmed
    """
    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>IIP — OTP Confirmation</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:16px;overflow:hidden;
                      box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);
                       padding:28px 32px;text-align:center;">
              <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                🏭 IIP Platform
              </span>
              <p style="margin:6px 0 0;color:#bfdbfe;font-size:12px;letter-spacing:1px;
                        text-transform:uppercase;font-weight:600;">
                Indian Industrial Products
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 8px;font-size:16px;color:#1e293b;font-weight:600;">
                Hi {user_name},
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
                You requested to <strong>{action}</strong> on the IIP platform.
                Use the OTP below to confirm this action.
              </p>

              <!-- OTP Box -->
              <div style="background:#eff6ff;border:2px dashed #93c5fd;border-radius:12px;
                          padding:24px;text-align:center;margin:0 0 24px;">
                <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:2px;
                           text-transform:uppercase;color:#2563eb;">
                  Your One-Time Password
                </p>
                <span style="font-size:42px;font-weight:900;color:#1e3a8a;letter-spacing:10px;">
                  {otp}
                </span>
                <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">
                  ⏱ Valid for <strong>10 minutes</strong>
                </p>
              </div>

              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                If you did not request this, please ignore this email — your account is safe.
                Do not share this OTP with anyone.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;
                       text-align:center;">
              <p style="margin:0;font-size:11px;color:#cbd5e1;">
                © 2026 IIP — Indian Industrial Products &nbsp;|&nbsp;
                <a href="#" style="color:#2563eb;text-decoration:none;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def build_welcome_email(user_name: str) -> str:
    """Branded welcome email for new registrations."""
    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:16px;overflow:hidden;
                    box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);
                     padding:28px 32px;text-align:center;">
            <span style="font-size:22px;font-weight:800;color:#ffffff;">🏭 IIP Platform</span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px;">
            <p style="font-size:16px;color:#1e293b;font-weight:600;">Welcome, {user_name}! 🎉</p>
            <p style="font-size:14px;color:#475569;line-height:1.6;">
              Your account on <strong>Indian Industrial Products</strong> has been created successfully.
              Start exploring verified buyer requirements, connect with suppliers, and grow your business.
            </p>
            <a href="#" style="display:inline-block;margin-top:16px;padding:12px 24px;
                               background:#ea580c;color:#fff;text-decoration:none;
                               border-radius:8px;font-weight:700;font-size:14px;">
              Go to Dashboard →
            </a>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#cbd5e1;">© 2026 IIP — Indian Industrial Products</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""
