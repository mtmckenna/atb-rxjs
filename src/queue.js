import { BehaviorSubject, defer, from, forkJoin, Subject, EMPTY, concat } from "rxjs";
import { concatAll, scan, share, tap } from "rxjs/operators";

export default class Queue {
  constructor() {
    this.queue$ = new Subject().pipe(concatAll(), share());
    this.size$ = new BehaviorSubject(0).pipe(scan((sum, next) => sum + next, 0));
    this.queuedSources = [];
    this.queue$.subscribe(() => {
      this.size$.next(-1);
      this.queuedSources.pop();
    });
  }

  isQueued(source) {
    return this.queuedSources.some(queued => queued === source);
  }

  add(item$, source = { name: "anonymous " }) {
    let itemToQueue$ = item$;
    this.queuedSources.unshift(source);
    this.size$.next(1);
    this.queue$.next(itemToQueue$);
  }
}
