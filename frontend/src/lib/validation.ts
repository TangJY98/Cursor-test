import { EMPTY_MESSAGE, MESSAGE_TOO_LONG } from "./errors";

export const MAX_MESSAGE_LENGTH = 8000;

export function validateMessage(content: string): string | null {
  if (!content.trim()) {
    return EMPTY_MESSAGE;
  }
  if (content.length > MAX_MESSAGE_LENGTH) {
    return MESSAGE_TOO_LONG;
  }
  return null;
}
