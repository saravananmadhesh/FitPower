/**
 * App events the model should know about (e.g. "the user accepted the plan")
 * ride along at the top of the next user message, tagged so the UI can hide them.
 */
export function withAppNotes(notes: string[], text: string): string {
  return notes.length ? `${notes.map((n) => `[App note: ${n}]`).join('\n')}\n\n${text}` : text;
}

/** The user's own words, without app notes. */
export function visibleUserText(text: string): string {
  return text.replace(/^\[App note: [^\n]*\]\n*/gm, '').trim();
}
