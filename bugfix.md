# Implementation Plan - Bugfix Branches from `staging`

This plan outlines the creation of 4 dedicated feature/bugfix branches from `staging` in `/home/arya/personal/Indian-Industrial-Products` to address each of the reported issues.

---

## Proposed Branches & Changes

### 1. Branch: `bugfix/leads-budget-timeframe-display`
**Issue**: Budget and time/delivery timeframe entered by the user while posting a requirement (`PostEnquiryPage`) are not saved/sent to backend or displayed in lead cards (`LeadsPage`) in locked/unlocked states.

#### [MODIFY] [server.py](file:///home/arya/personal/Indian-Industrial-Products/backend/server.py)
- Update `Enquiry` SQLAlchemy model: Add `budget = Column(String(255), nullable=True)` and `required_by = Column(String(255), nullable=True)`.
- Update Pydantic schemas: Add `budget: Optional[str] = None` and `required_by: Optional[str] = None` to `EnquiryCreate` and `EnquiryOut`.
- Update `POST /api/enquiries`: Store `budget` and `required_by` form parameters into new `Enquiry` records.

#### [MODIFY] [PostEnquiryPage.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/PostEnquiryPage.jsx)
- Append `budget` and `required_by` fields from `form` state to `FormData` when calling `api.post("/enquiries", fd)`.

#### [MODIFY] [LeadsPage.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/LeadsPage.jsx)
- Update lead cards to display `lead.budget` (with Wallet/Tag icon) and `lead.required_by` (with Clock/Calendar icon) in both locked and unlocked card states.

---

### 2. Branch: `bugfix/reels-search-functionality`
**Issue**: Search functionality is missing on the Reels page.

#### [MODIFY] [server.py](file:///home/arya/personal/Indian-Industrial-Products/backend/server.py)
- Update `@api.get("/reels")` endpoint: Accept an optional `search: Optional[str] = None` query parameter.
- Filter reels by matching `search` query against `Reel.content` and company metadata (`Company.name`, `Company.city`, `Company.state`).

#### [MODIFY] [ReelsPage.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/ReelsPage.jsx)
- Add a Search header bar/input on `ReelsPage`.
- Trigger debounced API calls to `api.get('/reels', { params: { search: query } })` when user searches.

---

### 3. Branch: `bugfix/reels-views-count-display`
**Issue**: Views count is not tracked or displayed on Reels.

#### [MODIFY] [server.py](file:///home/arya/personal/Indian-Industrial-Products/backend/server.py)
- Update `Reel` model: Add `views_count = Column(Integer, default=0, nullable=False)`.
- Update `ReelOut` schema: Add `views_count: int = 0`.
- Add endpoint `@api.post("/reels/{reel_id}/view")`: Increment `views_count` by 1 for the target reel.

#### [MODIFY] [ReelsPage.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/pages/ReelsPage.jsx)
- Call `api.post('/reels/${reel.id}/view')` when a reel active view index changes.
- Render `Eye` icon with formatted `views_count` in the right action rail of each reel.

---

### 4. Branch: `bugfix/profile-dropdown-mobile-scroll`
**Issue**: The profile menu dropdown in `TopHeader` contains many items, causing the Sign Out / Logout button to overflow beyond mobile screen bounds without scrollability.

#### [MODIFY] [TopHeader.jsx](file:///home/arya/personal/Indian-Industrial-Products/frontend/src/components/TopHeader.jsx)
- Add `max-h-[75vh] overflow-y-auto custom-scrollbar` to the profile dropdown menu container (`data-testid="profile-dropdown"`).

---

## Branch Creation Commands Workflow

For each bugfix, we will checkout `staging`, pull latest, and branch off:
1. `git checkout staging && git pull origin staging && git checkout -b bugfix/leads-budget-timeframe-display`
2. `git checkout staging && git checkout -b bugfix/reels-search-functionality`
3. `git checkout staging && git checkout -b bugfix/reels-views-count-display`
4. `git checkout staging && git checkout -b bugfix/profile-dropdown-mobile-scroll`

---

## Verification Plan

### Automated Tests
- Run existing pytest suite in `/home/arya/personal/Indian-Industrial-Products/backend` to verify API endpoint responses:
  ```bash
  pytest backend/tests/
  ```

### Manual Verification
1. **Lead Budget & Timeframe**: Post a requirement with custom budget and timeframe in `PostEnquiryPage`, open `LeadsPage`, verify both locked and unlocked lead cards show budget and timeframe.
2. **Reels Search**: Open `ReelsPage`, type a keyword into search bar, verify filtered reels are rendered.
3. **Reels Views**: Open `ReelsPage`, swipe to a reel, verify views count increments and is visible next to the Eye icon.
4. **Profile Mobile Dropdown**: Open app in mobile viewport, click profile picture in top header, verify dropdown scrolls smoothly and Sign Out button is accessible.
