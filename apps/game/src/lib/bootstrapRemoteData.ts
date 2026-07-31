import useCourseStore from '../zustandStores/courseStore';
import useSentenceStore from '../zustandStores/sentenceStore';
import useWordStore from '../zustandStores/wordStore';

/** Kick off course + word + sentence catalog fetches without blocking navigation. */
export function bootstrapRemoteData(): void {
  void useCourseStore.getState().fetchCourseStructure();
  void useWordStore.getState().fetchWords();
  void useSentenceStore.getState().fetchSentences();
}
