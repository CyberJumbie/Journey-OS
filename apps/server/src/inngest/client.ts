/**
 * Inngest client singleton.
 * [STORY-F-22] Durable function execution for notification triggers.
 */

import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "journey-os" });
