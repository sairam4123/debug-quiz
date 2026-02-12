import { EventEmitter } from "events";

// Global event emitter for the application
// In a serverless/multiple-instance environment, this would need Redis/etc.
// For this MVP (local/stateful server), a global variable works.
export const ee = new EventEmitter();

export const EVENTS = {
    SESSION_UPDATE: "SESSION_UPDATE",
};
