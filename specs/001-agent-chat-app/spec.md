# Feature Specification: Agent Chat App（v1）

**Feature Branch**: `001-agent-chat-app`

**Created**: 2026-08-12

**Status**: Draft

**Input**: User description: "建立一個簡單的 agent chat app。使用者可在 web 介面輸入繁體中文訊息，並收到由 backend agent 串流回傳的回覆。v1 只需要單一聊天 thread；不包含登入、資料庫、RAG、tools、上傳附件或 production deployment。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 送出訊息並即時看到串流回覆 (Priority: P1)

使用者開啟 web 聊天介面，以繁體中文輸入一則訊息並送出。系統將訊息送至 backend agent，並在畫面上逐步顯示 agent 的回覆內容（串流），直到回覆完成。整個對話發生在同一個聊天 thread 中，使用者可持續多輪對話。

**Why this priority**: 這是產品的核心價值——沒有串流聊天功能，其他能力都無意義。

**Independent Test**: 僅實作此故事即可交付可用的最小聊天體驗：使用者能輸入繁中訊息、送出、並在介面上看到逐步出現的回覆。

**Acceptance Scenarios**:

1. **Given** 使用者已開啟聊天介面且 backend 可用，**When** 使用者輸入繁體中文訊息「你好」並送出，**Then** 該則使用者訊息出現在對話區，且 agent 回覆以串流方式逐步顯示在同一 thread 中。
2. **Given** 使用者已收到一則完整回覆，**When** 使用者再送出第二則繁中訊息，**Then** 新訊息與新回覆依時間順序追加在同一 thread，先前訊息仍可見。
3. **Given** agent 正在串流回覆，**When** 回覆尚未結束，**Then** 介面持續更新顯示已收到的回覆片段，並有明確的「回覆進行中」狀態（例如載入指示或游標），直到回覆完成。

---

### User Story 2 - 檢查 backend 健康狀態 (Priority: P2)

維運者或開發者需要確認 backend agent 是否正常運作，無需透過聊天介面送訊息。

**Why this priority**: 可觀測性是除核心聊天外最重要的運維需求，且為使用者提供的驗收條件之一。

**Independent Test**: 在沒有聊天 UI 的情況下，透過 health/status 檢查即可判斷 backend 是否就緒。

**Acceptance Scenarios**:

1. **Given** backend 正常運作，**When** 呼叫 health/status 檢查，**Then** 回傳明確的「健康／就緒」狀態，可供人類或自動化腳本判讀。
2. **Given** backend 無法處理請求（例如 agent 未就緒），**When** 呼叫 health/status 檢查，**Then** 回傳明確的非健康狀態，並附帶可理解的原因說明（非僅空白或通用錯誤）。

---

### User Story 3 - 以環境設定切換 backend 位址 (Priority: P3)

開發者或部署人員需要將 web 前端指向不同的 backend 位址（例如本機、測試環境），而不修改程式碼。

**Why this priority**: 支援本機開發與不同環境切換，但不影響一般使用者的聊天體驗。

**Independent Test**: 僅變更環境設定即可讓前端連到指定 backend，並成功完成一則聊天往返。

**Acceptance Scenarios**:

1. **Given** 環境變數已設定為有效的 backend 位址，**When** 使用者啟動 web 介面並送出訊息，**Then** 訊息送往該位址且能收到串流回覆。
2. **Given** 環境變數指向無法連線的位址，**When** 使用者送出訊息，**Then** 介面顯示可理解的連線失敗訊息（繁體中文），且不會無限期等待。

---

### Edge Cases

- 使用者送出空白或僅含空白字元的訊息時，系統應阻止送出或提示重新輸入，不應向 backend 發送無效請求。
- backend 在串流中途斷線時，介面應停止「進行中」狀態，顯示已收到內容，並提示回覆未完成或連線中斷。
- 使用者在 agent 尚未回覆完成時再次送出訊息時，系統應排隊或禁用送出（擇一且行為一致），避免同一 thread 內回覆順序混亂。
- 使用者輸入極長訊息時，系統應有合理上限或明確錯誤提示，避免介面或傳輸無法處理。
- 使用者重新整理頁面時，由於 v1 無持久化，對話紀錄清空為預期行為；介面應以空白 thread 重新開始，不應顯示錯誤狀態。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統 MUST 提供 web 聊天介面，讓使用者以繁體中文輸入並送出訊息。
- **FR-002**: 系統 MUST 將使用者訊息送至 backend agent 並接收回覆。
- **FR-003**: 系統 MUST 以串流方式在 web 介面上逐步顯示 agent 回覆，直至回覆完成。
- **FR-004**: 系統 MUST 在 v1 僅支援單一聊天 thread（單一連續對話），不支援多 thread 切換或管理。
- **FR-005**: 系統 MUST 在同一 thread 內依時間順序顯示使用者訊息與 agent 回覆。
- **FR-006**: backend MUST 提供可檢查的 health/status 端點，回傳明確的就緒或非就緒狀態。
- **FR-007**: web 前端連線的 backend 位址 MUST 可透過環境變數設定，無需修改原始碼。
- **FR-008**: 當 backend 不可用或連線失敗時，系統 MUST 向使用者顯示繁體中文、可理解的錯誤訊息。
- **FR-009**: 系統 MUST NOT 在 v1 實作使用者登入、帳號或身分驗證。
- **FR-010**: 系統 MUST NOT 在 v1 使用資料庫或任何跨工作階段／跨重啟的訊息持久化。
- **FR-011**: 系統 MUST NOT 在 v1 實作 RAG、外部 tools、檔案上傳或附件。
- **FR-012**: 系統 MUST NOT 在 v1 包含 production deployment 流程或相關基礎設施定義。

### Key Entities

- **訊息（Message）**: 對話中的單一發言，包含發送者角色（使用者或 agent）、文字內容、以及相對於 thread 的順序。v1 僅存在於目前工作階段記憶體中。
- **聊天 thread（Chat Thread）**: v1 中唯一的一條對話序列，由多則訊息依時間組成。無名稱、無分頁、無持久化。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 使用者可在 30 秒內完成「開啟介面 → 輸入繁中訊息 → 送出 → 看到完整回覆」的完整流程（在 backend 正常時）。
- **SC-002**: 在 backend 正常時，使用者送出訊息後 3 秒內應看到回覆的第一段內容開始出現（串流起始）。
- **SC-003**: 100% 的驗收測試案例（三項 acceptance criteria）可通過：串流聊天、health/status 可檢查、環境變數切換 backend 位址。
- **SC-004**: backend 不可用時，使用者在 5 秒內看到明確的繁中錯誤提示，而非空白畫面或無限期載入。
- **SC-005**: 非技術驗收人員無需閱讀程式碼即可依規格中的情境完成手動驗收。

## Assumptions

- 目標使用者為能閱讀與輸入繁體中文的一般使用者；v1 不需多語系切換。
- v1 為單一使用者、單一瀏覽器工作階段；無需同時多人或跨裝置同步。
- 對話紀錄僅存於目前頁面工作階段；重新整理或關閉頁面即清空，屬預期行為。
- backend agent 已具備產生繁體中文回覆的能力；本功能負責傳遞訊息與呈現串流，不包含訓練或調整模型。
- v1 以本機或開發環境運行為主；不包含 production 部署、負載平衡或多服務拆分（符合專案憲章「預設不分佈」原則）。
- health/status 檢查可由瀏覽器開發者工具、命令列工具或簡單自動化腳本執行，無需專用監控平台。
- 環境變數為前端建置或執行時設定的標準機制；具體變數名稱於規劃階段（`/speckit-plan`）決定。

## Out of Scope (v1)

- 使用者登入與身分管理
- 資料庫與訊息持久化
- RAG、知識庫檢索
- Agent tools 與 function calling
- 檔案上傳與附件
- 多聊天 thread 管理
- Production deployment 與相關 CI/CD 基礎設施
