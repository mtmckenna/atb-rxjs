import { BehaviorSubject, Subject } from "rxjs";
import { concatAll, scan, share } from "rxjs/operators";

export default class Queue {
  constructor() {
    this.queue$ = new Subject().pipe(concatAll(), share());
    this.size$ = new BehaviorSubject(0).pipe(scan((sum, next) => sum + next, 0));
    this.queue$.subscribe(() => this.size$.next(-1));
  }

  add(item$) {
    this.size$.next(1);
    this.queue$.next(item$);
  }
}
