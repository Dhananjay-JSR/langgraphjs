import type { StateSnapshot } from "@langchain/langgraph";
import type { ThreadState } from "./storage/ops";
export declare const stateSnapshotToThreadState: (state: StateSnapshot) => ThreadState;
