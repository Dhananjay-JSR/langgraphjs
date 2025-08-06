import type { Checkpoint, RunnableConfig } from "../storage/ops";
export declare const runnableConfigToCheckpoint: (config: RunnableConfig | null | undefined) => Checkpoint | null;
export declare const taskRunnableConfigToCheckpoint: (config: RunnableConfig | null | undefined) => Partial<Checkpoint> | null;
