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
    characters: [
        { hp: 1250, mp: 75, wait: 10 },
        { hp: 475, mp: 200, wait: 90 },
        { hp: 750, mp: 120, wait: 0 }
    ]
};

const primaryMenu = document.getElementById("primary-menu");
const secondaryMenu = document.getElementById("secondary-menu");
const secondaryBack = document.getElementById("secondary-back");

const waitEls = Array(3).fill().map((_, i) => {
    return document
        .getElementById(`character-${i}-stats`)
        .getElementsByClassName("progress-bar")[0];
});

const waitFillingEls = Array(3).fill().map((_, i) => {
    return waitEls[i].getElementsByClassName("progress-bar-filling")[0];
});

const characterEls = Array(3).fill().map((_, i) => {
    return document.getElementById(`character-name-${i}`);
});

const clock$ = interval(0, animationFrameScheduler).pipe(share());

// Add to the wait timer
const waits$ = Array(3).fill().map((_, i) => {
    const character = values.characters[i];
    return clock$.pipe(map(() => Math.min(character.wait + .25, 100)));
});

const selectedCharater$ = new Subject();

const characterClick$ = Array(3).fill().map((_, i) => {
    const el = characterEls[i];
    const character = values.characters[i];
    const wait$ = waits$[i]
    return fromEvent(el, "click").pipe(
        withLatestFrom(wait$),
        filter(([_, wait]) => wait === 100),
        tap(() => {
            selectedCharater$.next(character)
        })
    )
});

selectedCharater$.pipe(
    tap((character) => {
        characterEls.forEach((el) => setSelected(el, false));
        if (character) {
            const el = characterEls[values.characters.indexOf(character)];
            setSelected(el, true);
            show(secondaryMenu);
        } else {
            hide(secondaryMenu);
        }
    })
).subscribe();

fromEvent(secondaryBack, "click").pipe(
    tap(() => selectedCharater$.next(null))
).subscribe();

fromEvent(document, "click").pipe(
    filter(event => event.target.classList.contains("action")),
    withLatestFrom(selectedCharater$),
    tap(([_, character]) => {
        character.wait = 0;
        selectedCharater$.next(null);
    })
).subscribe();

const characterSubs = Array(3).fill().map((_, i) => {
    return characterClick$[i].subscribe();
});

// Character name is no longer grayed out when timer is full
const waitSubs = waits$.map((wait$, i) =>{
    return wait$.subscribe((timer) => {
        setReady(characterEls[i], timer === 100);
        values.characters[i].wait = timer;
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
    waitFillingEls.forEach((el, i) => {
        el.style.width = `${values.characters[i].wait}%`;
    });
}

requestAnimationFrame(draw)
