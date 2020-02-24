import { BehaviorSubject, defer, from, forkJoin, Subject, EMPTY, concat } from "rxjs";
import { concatAll, scan, share, tap } from "rxjs/operators";

export default class Queue {
  constructor() {
    this.queue$ = new Subject().pipe(concatAll(), share());
    this.size$ = new BehaviorSubject(0).pipe(scan((sum, next) => sum + next, 0));
    this.queuedHeroes = [];
    this.queue$.subscribe(() => this.size$.next(-1));
  }

  add(item$, hero = null) {
    let itemToQueue$ = item$;

    if (hero) {
      this.queuedHeroes.push(hero);
      const remove = () => (this.queuedHeroes = this.queuedHeroes.filter(q => q !== hero));
      const remove$ = defer(remove);
      itemToQueue$ = concat(item$, remove$);
    }

    this.size$.next(1);
    this.queue$.next(itemToQueue$);
  }
}
