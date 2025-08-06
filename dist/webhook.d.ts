import type { Run } from "./storage/ops";
import type { StreamCheckpoint } from "./stream";
export declare function callWebhook(result: {
    checkpoint: StreamCheckpoint | undefined;
    status: string | undefined;
    exception: Error | undefined;
    run: Run;
    webhook: string;
    run_started_at: Date;
    run_ended_at: Date | undefined;
}): Promise<void>;
