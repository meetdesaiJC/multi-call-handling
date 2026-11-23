import { useState } from "react";
import { Sidenav } from "@/components/Sidenav";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Tabs, type TabItem } from "@/components/Tabs";
import { CallLogFilters } from "./CallLogFilters";
import { CallLogsTable } from "./CallLogsTable";
import { CheckoutSelectLicenses } from "./CheckoutSelectLicenses";
import { BillingOverview, TEAM_MEMBERS } from "./BillingOverview";
import { PrototypeLauncher } from "./PrototypeLauncher";
import { Dashboard } from "./Dashboard";

const CALL_LOG_TABS: TabItem[] = [
  { key: "all", label: "All" },
  { key: "missed", label: "Missed" },
  { key: "voicemail", label: "Voicemail" },
];

// Seed for the "Approve pending license requests" prototype: lands on the
// Dashboard with licenses already assigned and a handful of open requests,
// so the pending-requests banner is visible on arrival (and stays visible
// once the admin clicks through to Billing Overview).
const REVIEW_REQUESTS_LICENSES_TOTAL = 25;
const REVIEW_REQUESTS_ASSIGNED_COUNT = 4;
const REVIEW_REQUESTS_PENDING_COUNT = 5;
const REVIEW_REQUESTS_TEAM_MEMBERS = TEAM_MEMBERS.map((member, index) => ({
  ...member,
  assigned: index < REVIEW_REQUESTS_ASSIGNED_COUNT,
  requested:
    index >= REVIEW_REQUESTS_ASSIGNED_COUNT &&
    index < REVIEW_REQUESTS_ASSIGNED_COUNT + REVIEW_REQUESTS_PENDING_COUNT,
}));
const REVIEW_REQUESTS_FIRST_REQUESTER_NAME = REVIEW_REQUESTS_TEAM_MEMBERS.find(
  (member) => member.requested
)?.name;

type View =
  | "launcher"
  | "call-logs"
  | "call-logs-approval-flow"
  | "checkout"
  | "billing-overview"
  | "dashboard-review-requests"
  | "billing-overview-review-requests";

export default function App() {
  const [activeTab, setActiveTab] = useState("all");
  const [view, setView] = useState<View>("launcher");
  const [aiReviewAssistLicenses, setAiReviewAssistLicenses] = useState(0);
  const [showPurchaseToast, setShowPurchaseToast] = useState(false);
  const [isBuyingAdditionalLicenses, setIsBuyingAdditionalLicenses] = useState(false);

  if (view === "launcher") {
    return (
      <PrototypeLauncher
        onStartLicenses={() => setView("call-logs")}
        onStartApprovalFlow={() => setView("call-logs-approval-flow")}
        onStartReviewRequests={() => setView("dashboard-review-requests")}
      />
    );
  }

  if (view === "dashboard-review-requests") {
    return (
      <Dashboard
        pendingRequesterName={REVIEW_REQUESTS_FIRST_REQUESTER_NAME}
        aiReviewAssistLicenses={REVIEW_REQUESTS_LICENSES_TOTAL}
        teamMembers={REVIEW_REQUESTS_TEAM_MEMBERS}
        onBuyAdditionalLicenses={() => {
          setIsBuyingAdditionalLicenses(true);
          setView("checkout");
        }}
        onGoToBilling={() => setView("billing-overview-review-requests")}
      />
    );
  }

  if (view === "billing-overview-review-requests") {
    return (
      <BillingOverview
        aiReviewAssistLicenses={REVIEW_REQUESTS_LICENSES_TOTAL}
        initialTeamMembers={REVIEW_REQUESTS_TEAM_MEMBERS}
        onBackToDashboard={() => setView("dashboard-review-requests")}
        onBuyAdditionalLicenses={() => {
          setIsBuyingAdditionalLicenses(true);
          setView("checkout");
        }}
      />
    );
  }

  if (view === "checkout") {
    return (
      <CheckoutSelectLicenses
        alreadyOwnsAddon={isBuyingAdditionalLicenses}
        onClose={() => setView("call-logs")}
        onConfirm={(licenses) => {
          setAiReviewAssistLicenses((prev) => prev + licenses);
          setShowPurchaseToast(true);
          setView("billing-overview");
        }}
      />
    );
  }

  if (view === "billing-overview") {
    return (
      <BillingOverview
        aiReviewAssistLicenses={aiReviewAssistLicenses}
        showSuccessToast={showPurchaseToast}
        onDismissToast={() => setShowPurchaseToast(false)}
        onBackToDashboard={() => setView("call-logs")}
        onBuyAdditionalLicenses={() => {
          setIsBuyingAdditionalLicenses(true);
          setView("checkout");
        }}
      />
    );
  }

  const isApprovalFlow = view === "call-logs-approval-flow";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidenav activeKey="call-logs" />

      <div className="flex min-w-0 flex-1 flex-col">
        <GlobalHeader title="Call Logs" />
        <div className="border-b border-line bg-white px-6">
          <Tabs items={CALL_LOG_TABS} value={activeTab} onValueChange={setActiveTab} />
        </div>
        <CallLogFilters />

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white p-4">
          <CallLogsTable
            variant={isApprovalFlow ? "team-member" : "admin"}
            onGetAiReviewAssist={
              isApprovalFlow
                ? undefined
                : () => {
                    setIsBuyingAdditionalLicenses(false);
                    setView("checkout");
                  }
            }
          />
        </main>
      </div>
    </div>
  );
}
