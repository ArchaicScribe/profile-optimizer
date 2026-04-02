import { ProfileAuditorAgent } from "./ProfileAuditorAgent";
import { JobRankerAgent } from "./JobRankerAgent";

// The Orchestrator coordinates the agent network.
// It owns the lifecycle of each agent and routes requests to the right one.
// Keeping this separate from the use cases means the use cases stay thin
// and the agent coordination logic is testable in isolation.
export class Orchestrator {
  readonly profileAuditor: ProfileAuditorAgent;
  readonly jobRanker: JobRankerAgent;

  constructor() {
    this.profileAuditor = new ProfileAuditorAgent();
    this.jobRanker = new JobRankerAgent();
  }

  static create(): Orchestrator {
    return new Orchestrator();
  }
}
