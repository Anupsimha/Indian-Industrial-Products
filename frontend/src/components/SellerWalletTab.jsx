import React, { useState, useEffect } from "react";
import { Wallet, Landmark, ArrowUpRight, ArrowDownLeft, ShieldCheck, Clock, CheckCircle2, AlertCircle, RefreshCw, ChevronRight } from "lucide-react";
import api, { formatApiError } from "../lib/api";
import { toast } from "sonner";

export const SellerWalletTab = () => {
  const [wallet, setWallet] = useState(null);
  const [bank, setBank] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingBank, setSavingBank] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);

  const [bankForm, setBankForm] = useState({
    bank_name: "",
    account_holder_name: "",
    account_number: "",
    ifsc_code: "",
    account_type: "current",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [walletRes, bankRes, txRes] = await Promise.all([
        api.get("/companies/me/wallet"),
        api.get("/companies/me/bank-account"),
        api.get("/companies/me/wallet/transactions"),
      ]);
      setWallet(walletRes.data);
      setBank(bankRes.data);
      setTransactions(txRes.data || []);

      if (bankRes.data) {
        setBankForm({
          bank_name: bankRes.data.bank_name || "",
          account_holder_name: bankRes.data.account_holder_name || "",
          account_number: "",
          ifsc_code: "",
          account_type: bankRes.data.account_type || "current",
        });
      } else {
        setShowBankForm(true);
      }
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Failed to load wallet information");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveBankDetails = async (e) => {
    e.preventDefault();
    if (!bankForm.bank_name.trim()) return toast.error("Bank name is required");
    if (!bankForm.account_holder_name.trim()) return toast.error("Account holder name is required");
    if (!bankForm.account_number.trim() || bankForm.account_number.trim().length < 8) return toast.error("Valid bank account number (min 8 digits) is required");
    if (!bankForm.ifsc_code.trim() || bankForm.ifsc_code.trim().length !== 11) return toast.error("Valid 11-character IFSC code is required");

    setSavingBank(true);
    try {
      const res = await api.put("/companies/me/bank-account", bankForm);
      setBank(res.data);
      setShowBankForm(false);
      toast.success("Encrypted Bank Account Details saved successfully!");
      loadData();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Failed to save bank details");
    } finally {
      setSavingBank(false);
    }
  };

  const changeSettlementPolicy = async (policy) => {
    try {
      const res = await api.patch("/companies/me/settlement-policy", { settlement_policy: policy });
      setWallet(res.data);
      toast.success(`Settlement policy updated to ${policy.replace("_", " ").toUpperCase()}`);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Failed to update settlement policy");
    }
  };

  const redeemFunds = async () => {
    if (!bank) return toast.error("Please add and verify your bank account before redeeming funds.");
    if (!wallet || wallet.available_balance <= 0) return toast.error("No available balance to redeem.");

    if (!window.confirm(`Request payout redemption of ₹${wallet.available_balance.toLocaleString("en-IN")} to your bank account (${bank.masked_account_number})?`)) return;

    setRedeeming(true);
    try {
      const res = await api.post("/companies/me/wallet/redeem");
      toast.success(`Payout request of ₹${res.data.amount} submitted! Settlement is processing.`);
      loadData();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Failed to redeem funds");
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-orange-600" />
        <p className="text-sm font-medium">Loading Wallet & Bank Account Ledger...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="seller-wallet-tab">
      {/* Wallet Balance Cards Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Available Balance */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-lg border border-slate-700/60 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Available for Payout</span>
            <Wallet size={18} className="text-emerald-400" />
          </div>
          <div className="text-3xl font-display font-extrabold text-white">
            ₹{(wallet?.available_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Ready for instant redemption</span>
            <button
              onClick={redeemFunds}
              disabled={redeeming || (wallet?.available_balance || 0) <= 0 || !bank}
              data-testid="redeem-payout-btn"
              className="px-3 py-1.5 bg-orange-600 text-white hover:bg-orange-500 disabled:opacity-50 text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1"
            >
              {redeeming ? "Processing..." : "Redeem Funds"} <ArrowUpRight size={14} />
            </button>
          </div>
        </div>

        {/* Pending Balance */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Pending (In Delivery)</span>
            <Clock size={18} className="text-amber-500" />
          </div>
          <div className="text-3xl font-display font-bold text-slate-900">
            ₹{(wallet?.pending_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-4">
            Moved to available balance upon order completion.
          </p>
        </div>

        {/* Total Settled */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Settled (Payouts)</span>
            <Landmark size={18} className="text-blue-600" />
          </div>
          <div className="text-3xl font-display font-bold text-slate-900">
            ₹{(wallet?.total_settled || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-4">
            Total deposited into verified bank account.
          </p>
        </div>
      </div>

      {/* Bank Account Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div>
            <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Landmark size={18} className="text-orange-600" /> Verified Bank Account Details
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Encrypted using AES-256 Fernet cipher. Used for direct payout settlements.
            </p>
          </div>
          {bank && !showBankForm && (
            <button
              onClick={() => setShowBankForm(true)}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700"
            >
              Edit Details
            </button>
          )}
        </div>

        {bank && !showBankForm ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">{bank.account_holder_name}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase flex items-center gap-1">
                  <CheckCircle2 size={12} /> {bank.verification_status}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                {bank.bank_name} • Account: <span className="font-mono font-semibold">{bank.masked_account_number}</span> ({bank.account_type.toUpperCase()})
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <ShieldCheck size={16} className="text-emerald-600 shrink-0" /> AES-256 Encrypted
            </div>
          </div>
        ) : (
          <form onSubmit={saveBankDetails} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Bank Name *</label>
                <input
                  required
                  value={bankForm.bank_name}
                  onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                  placeholder="e.g. HDFC Bank, ICICI Bank, State Bank of India"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Account Holder Name *</label>
                <input
                  required
                  value={bankForm.account_holder_name}
                  onChange={(e) => setBankForm({ ...bankForm, account_holder_name: e.target.value })}
                  placeholder="Name as printed on Passbook / Cheque"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Account Number *</label>
                <input
                  required
                  type="password"
                  value={bankForm.account_number}
                  onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
                  placeholder="Enter Bank Account Number"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">11-Character IFSC Code *</label>
                <input
                  required
                  maxLength={11}
                  value={bankForm.ifsc_code}
                  onChange={(e) => setBankForm({ ...bankForm, ifsc_code: e.target.value.toUpperCase() })}
                  placeholder="e.g. HDFC0001234"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 outline-none font-mono uppercase"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={savingBank}
                className="px-5 py-2 rounded-lg bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 disabled:opacity-60 shadow-xs"
              >
                {savingBank ? "Encrypting & Saving..." : "Save Bank Details"}
              </button>
              {bank && (
                <button
                  type="button"
                  onClick={() => setShowBankForm(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Settlement Policy Preference */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <h4 className="font-bold text-slate-900 text-base mb-1">Automated Settlement Policy</h4>
        <p className="text-xs text-slate-500 mb-4">Choose how frequently sales payouts are transferred to your bank account.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { id: "weekly", label: "Weekly Settlement", desc: "Payouts processed every Monday morning automatically." },
            { id: "monthly", label: "Monthly Settlement", desc: "Payouts processed on 1st of every month." },
            { id: "on_demand", label: "On-Demand Redeem", desc: "Withdraw balance manually whenever you want." },
          ].map((item) => (
            <div
              key={item.id}
              onClick={() => changeSettlementPolicy(item.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                wallet?.settlement_policy === item.id
                  ? "border-orange-600 bg-orange-50/50 ring-2 ring-orange-200"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-slate-900">{item.label}</span>
                {wallet?.settlement_policy === item.id && <CheckCircle2 size={16} className="text-orange-600" />}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <h4 className="font-bold text-slate-900 text-base mb-3">Wallet Transaction Ledger</h4>
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No wallet transactions recorded yet. Sales earnings will appear here upon order placement.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80">
                    <td className="p-3 text-slate-500">{new Date(t.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="p-3 font-bold">
                      {t.type === "CREDIT_SALE" ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px]">CREDIT</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 text-[10px]">DEBIT</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-800 font-medium">{t.description}</td>
                    <td className={`p-3 text-right font-bold ${t.type === "CREDIT_SALE" ? "text-emerald-600" : "text-slate-900"}`}>
                      {t.type === "CREDIT_SALE" ? "+" : "-"}₹{t.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-600">₹{t.balance_after.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
