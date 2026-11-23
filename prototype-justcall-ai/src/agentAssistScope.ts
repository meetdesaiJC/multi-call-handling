/**
 * Which release of Agent Assist a prototype is walking.
 *
 * V1 ships three things: Scripts, Response Cards and Knowledge Base.
 * Behavioral Coaching, In-call Actions and Live Assist land in V2, so V1 has
 * to hide them on both sides of the product — the admin nav drops two
 * sections, and the live call drops the coaching cues, the suggested actions
 * and the Live Assist control in the call bar.
 *
 * One flag rather than a forked copy of the screens: everything else about the
 * two releases is identical today, and a fork would drift the moment either
 * one is touched. It threads App → Dashboard → DialerPanel on the agent side
 * and App → JustCallAiShell → AgentAssistAdmin on the admin side, defaulting
 * to `"v2"` everywhere so an unpassed prop keeps the fuller experience.
 */
export type AgentAssistScope = "v1" | "v2";
