import { IconArrowRight } from "@/components/Icon";

type PrototypeLauncherProps = {
  onStartLicenses: () => void;
  onStartApprovalFlow: () => void;
  onStartReviewRequests: () => void;
};

function PrototypeCard({
  index,
  title,
  onClick,
}: {
  index: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative h-[179px] w-full overflow-hidden rounded-lg border border-line bg-avatar-indigo-bg text-left transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out hover:-translate-y-1 hover:border-brand hover:bg-brand-subtle hover:shadow-200 active:scale-[0.98] active:duration-75 active:ease-in"
    >
      <div className="absolute left-[19px] top-[85px] flex w-[260px] flex-col gap-1">
        <p className="w-full text-heading-xl text-disabled-fg transition-colors duration-200 ease-out group-hover:text-brand">
          {index}
        </p>
        <p className="w-full text-heading-xl text-foreground">{title}</p>
      </div>
      <IconArrowRight
        size={24}
        className="absolute right-[19px] top-[134px] text-foreground transition-transform duration-200 ease-out group-hover:translate-x-1.5"
      />
    </button>
  );
}

export function PrototypeLauncher({
  onStartLicenses,
  onStartApprovalFlow,
  onStartReviewRequests,
}: PrototypeLauncherProps) {
  return (
    <div className="flex h-screen bg-white pl-[75px] pt-[42px]">
      <div className="flex w-[333px] flex-col items-start gap-[31px]">
        <p className="w-full text-heading-xl text-foreground">Prototypes</p>

        <PrototypeCard index="01" title="Purchase and manage licenses" onClick={onStartLicenses} />
        <PrototypeCard index="02" title="Request flow from team members" onClick={onStartApprovalFlow} />
        <PrototypeCard
          index="03"
          title="Approve pending license requests"
          onClick={onStartReviewRequests}
        />
      </div>
    </div>
  );
}
