import useCourseStore from '../zustandStores/courseStore';
import useWordStore from '../zustandStores/wordStore';

/** Kick off course + word catalog fetches without blocking navigation. */
export function bootstrapRemoteData(): void {
  void useCourseStore.getState().fetchCourseStructure();
  void useWordStore.getState().fetchWords();
}
