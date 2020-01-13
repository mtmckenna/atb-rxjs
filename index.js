import {
    fromEvent,
    interval,
    animationFrameScheduler,
    Subject,
} from "rxjs";
import {
    filter,
    switchMap,
    map,
    share,
    tap,
    withLatestFrom,
} from "rxjs/operators";

const values = {
    heros: [
        { maxHp: 1500, hp: 1250, mp: 75, wait: 10 },
        { maxHp: 600,  hp: 475, mp: 200, wait: 90 },
        { maxHp: 250,  hp: 750, mp: 120, wait: 0 }
    ]
};

const secondaryMenu = document.getElementById("secondary-menu");
const secondaryBack = document.getElementById("secondary-back");

const waitEls = Array(3).fill().map((_, i) => {
    return document
        .getElementById(`hero-${i}-stats`)
        .getElementsByClassName("progress-bar")[0];
});

const waitFillingEls = Array(3).fill().map((_, i) => {
    return waitEls[i].getElementsByClassName("progress-bar-filling")[0];
});

const heroEls = Array(3).fill().map((_, i) => {
    return document.getElementById(`hero-name-${i}`);
});

const hpEls = Array(3).fill().map((_, i) => {
    return document
    .getElementById(`hero-${i}-stats`)
    .getElementsByClassName("hp")[0];
});

const mpEls = Array(3).fill().map((_, i) => {
    return document
    .getElementById(`hero-${i}-stats`)
    .getElementsByClassName("mp")[0];
});

const heroSpriteEls = Array(3).fill().map((_, i) => {
    return document
    .getElementById(`hero-${i}`)
    .getElementsByClassName("sprite")[0];
});

const clock$ = interval(0, animationFrameScheduler).pipe(share());

// Add to the wait timer
const waits$ = Array(3).fill().map((_, i) => {
    const hero = values.heros[i];
    return clock$.pipe(map(() => Math.min(hero.wait + .25, 100)));
});

const selectedCharater$ = new Subject();

const heroClick$ = Array(3).fill().map((_, i) => {
    const el = heroEls[i];
    const elSprite = heroSpriteEls[i];
    const hero = values.heros[i];
    const wait$ = waits$[i]
    return fromEvent([el, elSprite], "click").pipe(
        withLatestFrom(wait$),
        filter(([_, wait]) => wait === 100),
        tap(() => selectedCharater$.next(hero))
    )
});

selectedCharater$.pipe(
    tap((hero) => {
        heroEls.forEach((el) => setSelected(el, false));
        heroSpriteEls.forEach((el) => setSelected(el, false));

        if (hero) {
            const el = heroEls[values.heros.indexOf(hero)];
            const spriteEl = heroSpriteEls[values.heros.indexOf(hero)];
            setSelected(el, true);
            setSelected(spriteEl, true);
            show(secondaryMenu);
        } else {
            hide(secondaryMenu);
        }
    })
).subscribe();

fromEvent(secondaryBack, "click").pipe(tap(() => selectedCharater$.next(null))).subscribe();

fromEvent(document, "click").pipe(
    filter(event => event.target.classList.contains("action")),
    withLatestFrom(selectedCharater$),
    tap(([_, hero]) => {
        hero.wait = 0;
        selectedCharater$.next(null);
    })
).subscribe();

const heroSubs = Array(3).fill().map((_, i) => {
    return heroClick$[i].subscribe();
});

// hero name is no longer grayed out when timer is full
const waitSubs = waits$.map((wait$, i) =>{
    return wait$.subscribe((timer) => {
        setReady(heroEls[i], timer === 100);
        setReady(heroSpriteEls[i], timer === 100);
        values.heros[i].wait = timer;
    });
})

function setReady(element, isReady) {
    if (isReady) {
        element.classList.add("ready");
    } else {
        element.classList.remove("ready");
    }
}

function setSelected(element, isSelected) {
    if (isSelected) {
        element.classList.add("selected");
    } else {
        element.classList.remove("selected");
    }   
}

function hide(el) {
    el.classList.remove("show");
    el.classList.add("hide");
}

function show(el) {
    el.classList.remove("hide");
    el.classList.add("show");
}

function draw() {
    requestAnimationFrame(draw);
    waitFillingEls.forEach((el, i) => el.style.width = `${values.heros[i].wait}%`);
    hpEls.forEach((el, i) => el.textContent = `${values.heros[i].hp} / ${values.heros[i].maxHp}`);
    mpEls.forEach((el, i) => el.textContent = `${values.heros[i].mp}`);
}

requestAnimationFrame(draw)
