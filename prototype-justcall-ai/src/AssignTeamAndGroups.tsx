import * as React from "react";
import { Dropdown, type DropdownListItem } from "@/components/Dropdown";

export interface AssignTeamAndGroupsProps {
  members: DropdownListItem[];
  groups: DropdownListItem[];
  selectedMembers: string[];
  selectedGroups: string[];
  onMembersChange: (value: string[]) => void;
  onGroupsChange: (value: string[]) => void;
  /**
   * Voice agents that read the same thing. Optional — pass it only where the
   * record can serve an AI caller as well as a human one, and a third dropdown
   * appears under the two people fields.
   */
  voiceAgents?: DropdownListItem[];
  selectedVoiceAgents?: string[];
  onVoiceAgentsChange?: (value: string[]) => void;
  /** Reason the voice agent field is unavailable — greys it out when set. */
  voiceAgentsDisabledReason?: string;
  /**
   * "card" is the standalone sidebar panel (bordered box, field labels).
   * "summary" renders bare dropdowns for use under externally-provided dt labels, e.g. inside
   * the publish confirmation modal.
   * "bare" keeps the field labels but drops the box, for dropping inside a
   * panel that already draws its own border and heading.
   */
  variant?: "card" | "summary" | "bare";
}

export function AssignTeamAndGroups({
  members,
  groups,
  selectedMembers,
  selectedGroups,
  onMembersChange,
  onGroupsChange,
  voiceAgents,
  selectedVoiceAgents = [],
  onVoiceAgentsChange,
  voiceAgentsDisabledReason,
  variant = "card",
}: AssignTeamAndGroupsProps) {
  const showLabels = variant === "card" || variant === "bare";

  const membersDropdown = (
    <Dropdown
      label={showLabels ? "Assign team members" : undefined}
      placeholder="Search team members"
      searchPlaceholder="Search team members"
      options={members}
      multiple
      searchable
      maxVisibleTags={1}
      value={selectedMembers}
      onValueChange={(value) => onMembersChange(Array.isArray(value) ? value : [value])}
    />
  );

  const groupsDropdown = (
    <Dropdown
      label={showLabels ? "Assign user groups" : undefined}
      placeholder="Search user groups"
      searchPlaceholder="Search user groups"
      options={groups}
      multiple
      searchable
      maxVisibleTags={1}
      value={selectedGroups}
      onValueChange={(value) => onGroupsChange(Array.isArray(value) ? value : [value])}
    />
  );

  const voiceAgentsDropdown = voiceAgents ? (
    <Dropdown
      label={showLabels ? "Assign voice agents" : undefined}
      placeholder={
        voiceAgentsDisabledReason ? "Not available" : "Search voice agents"
      }
      searchPlaceholder="Search voice agents"
      options={voiceAgents}
      multiple
      searchable
      maxVisibleTags={1}
      disabled={Boolean(voiceAgentsDisabledReason)}
      value={selectedVoiceAgents}
      onValueChange={(value) =>
        onVoiceAgentsChange?.(Array.isArray(value) ? value : [value])
      }
    />
  ) : null;

  if (!showLabels) {
    return (
      <>
        <div>
          <dt className="text-label-sm text-muted-foreground">Team members</dt>
          <dd className="mt-1.5">{membersDropdown}</dd>
        </div>
        <div>
          <dt className="text-label-sm text-muted-foreground">User groups</dt>
          <dd className="mt-1.5">{groupsDropdown}</dd>
        </div>
        {voiceAgentsDropdown ? (
          <div>
            <dt className="text-label-sm text-muted-foreground">Voice agents</dt>
            <dd className="mt-1.5">{voiceAgentsDropdown}</dd>
            {voiceAgentsDisabledReason ? (
              <p className="mt-1.5 text-pretty text-paragraph-sm text-muted-foreground">
                {voiceAgentsDisabledReason}
              </p>
            ) : null}
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div
      className={
        variant === "bare"
          ? "flex flex-col gap-4"
          : "flex flex-col gap-4 rounded-lg border border-line bg-white p-4"
      }
    >
      {membersDropdown}
      {groupsDropdown}
      {voiceAgentsDropdown}
      {voiceAgentsDropdown && voiceAgentsDisabledReason ? (
        <p className="-mt-2 text-pretty text-paragraph-sm text-muted-foreground">
          {voiceAgentsDisabledReason}
        </p>
      ) : null}
    </div>
  );
}
