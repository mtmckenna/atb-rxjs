import {
    fromEvent,
    interval,
    merge,
    animationFrameScheduler,
} from "rxjs";
import {
    scan,
    mapTo,
    share,
} from "rxjs/operators";

const values = {
    characters: [
        { hp: 1250, mp: 75, wait: 10 },
        { hp: 475, mp: 200, wait: 50 },
        { hp: 750, mp: 120, wait: 0 }
    ]
};

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
    return merge(
        clock$.pipe(mapTo(1)),
        fromEvent(characterEls[i], "click").pipe(mapTo(-1))
    ).pipe(
        scan((acc, val) => acc === 100 && val === -1 ? 0 : Math.min(acc + 1, 100), values.characters[i].wait),
    );
});

// Set class on cahracters when wait timer is ready
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

function draw() {
    requestAnimationFrame(draw);
    waitFillingEls.forEach((el, i) => {
        el.style.width = `${values.characters[i].wait}%`;
    });
}

requestAnimationFrame(draw)
