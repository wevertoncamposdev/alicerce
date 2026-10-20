'use server';

import { apiServer } from "@lib/api-server";

export async function changeMyEmail(newEmail: string): Promise<void> {
    await apiServer.post("me/email", { newEmail });
}
