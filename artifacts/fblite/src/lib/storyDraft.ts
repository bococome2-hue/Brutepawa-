export interface StoryDraft {
  file: File;
  previewUrl: string;
}

let _draft: StoryDraft | null = null;

export const storyDraftStore = {
  set(d: StoryDraft) { _draft = d; },
  get(): StoryDraft | null { return _draft; },
  /** Clears the store reference. Caller is responsible for revoking the object URL. */
  clear() { _draft = null; },
};
