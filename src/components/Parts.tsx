import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useSpring, type Variants } from "motion/react";
import { animate, stagger } from "animejs";
import { MS, calendarAge, instantToWall, nextBirthday, nextMilestone, wallToInstant } from "../lib/time";
import { TimeOrb } from "./TimeOrb";
import { fmtDate, fracOf, nf, pad, reducedMotion } from "../lib/format";

/* Motion: entrance choreography. Headline number first, then sections, then their cells. */
export const page: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } } };
export const rise: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 20 } },
};
export const list: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
export const cell: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 160, damping: 18 } },
};

/** A value that slides when it changes, so a ticking clock reads as a state change. */
export function Roll({ value }: { value: string }) {
  return (
    <span className="roll">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          className="roll-d"
          initial={{ y: "-70%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "70%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function Stat({ value, label, roll, lift }: { value: string; label: string; roll?: boolean; lift?: boolean }) {
  return (
    <motion.div
      className="stat"
      variants={cell}
      whileHover={lift ? { x: 6, transition: { type: "spring", stiffness: 300, damping: 20 } } : undefined}
    >
      <dt>{label}</dt>
      <dd>{roll ? <Roll value={value} /> : value}</dd>
    </motion.div>
  );
}

/* anime.js: the empty-state number breathes digit by digit while it waits for input. */
export function GhostNumber() {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!ref.current || reducedMotion()) return;
    const a = animate(ref.current.querySelectorAll(".ghost-ch"), {
      opacity: [0.3, 1],
      delay: stagger(70),
      duration: 900,
      ease: "inOutSine",
      loop: true,
      alternate: true,
    });
    return () => {
      a.revert();
    };
  }, []);
  return (
    <p className="big" aria-hidden="true" ref={ref}>
      {"0,000,000".split("").map((c, i) => <span key={i} className="ghost-ch">{c}</span>)}
      <span className="frac">
        {".0000".split("").map((c, i) => <span key={i} className="ghost-ch">{c}</span>)}
      </span>
    </p>
  );
}

/* anime.js: on first reveal the hour count winds up from zero to the live value, then React takes over. */
export function Readout({ birth, now }: { birth: Date; now: Date }) {
  const hours = (now.getTime() - birth.getTime()) / MS.h;
  const whole = Math.floor(hours);
  const mile = nextMilestone(birth, hours);

  const hoursRef = useRef(hours);
  hoursRef.current = hours;
  const wholeEl = useRef<HTMLSpanElement>(null);
  const fracEl = useRef<HTMLSpanElement>(null);
  const [settled, setSettled] = useState(() => reducedMotion());

  useEffect(() => {
    if (settled) return;
    const state = { p: 0 };
    const a = animate(state, {
      p: 1,
      delay: 250,
      duration: 1800,
      ease: "outExpo",
      onUpdate: () => {
        const h = hoursRef.current * state.p;
        if (wholeEl.current) wholeEl.current.textContent = nf.format(Math.floor(h));
        if (fracEl.current) fracEl.current.textContent = `.${fracOf(h)}`;
      },
      onComplete: () => setSettled(true),
    });
    return () => {
      a.revert();
    };
  }, [settled]);

  const fill = useSpring(0, { stiffness: 60, damping: 18 });
  useEffect(() => {
    fill.set(mile.progress);
  }, [fill, mile.progress]);

  return (
    <motion.section
      className="readout"
      aria-live="off"
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 110, damping: 20 }}
    >
      <div className="hero-text">
        <p className="big">
          <span hidden={settled}>
            <span ref={wholeEl}>0</span>
            <span ref={fracEl} className="frac">.0000</span>
          </span>
          <span hidden={!settled}>
            {nf.format(whole)}
            <span className="frac">.{fracOf(hours)}</span>
          </span>
        </p>
        <p className="caption"><span className="live"><i aria-hidden="true" />Live</span>hours alive</p>
        <div className="bar" aria-hidden="true">
          <motion.i style={{ scaleX: fill }} />
        </div>
        <p className="bar-note">
          Hour {nf.format(mile.target)} arrives on {fmtDate(mile.at)} ({(mile.progress * 100).toFixed(1)}% there)
        </p>
      </div>
      <TimeOrb progress={mile.progress} />
    </motion.section>
  );
}

/** Age and totals. Calendar parts are read off the clock in the birth time zone. */
export function Breakdown({ birth, tz, now }: { birth: Date; tz: string; now: Date }) {
  const ms = now.getTime() - birth.getTime();
  const wallBirth = instantToWall(birth, tz);
  const wallNow = instantToWall(now, tz);
  const age = calendarAge(wallBirth, wallNow);
  const nbWall = nextBirthday(wallBirth, wallNow);
  const daysToBirthday = Math.ceil((wallToInstant(nbWall, tz).getTime() - now.getTime()) / MS.d);

  return (
    <motion.div variants={page} initial="hidden" animate="show">
      <motion.section className="block" variants={rise}>
        <h2>Your age, exactly</h2>
        <motion.dl className="age" variants={list}>
          <Stat value={String(age.years)} label="years" />
          <Stat value={String(age.months)} label="months" />
          <Stat value={String(age.days)} label="days" />
          <Stat value={pad(age.hours)} label="hours" roll />
          <Stat value={pad(age.minutes)} label="minutes" roll />
          <Stat value={pad(age.seconds)} label="seconds" roll />
        </motion.dl>
      </motion.section>

      <div className="lower">
        <motion.section className="block" variants={rise}>
          <h2>Total time lived</h2>
          <motion.dl className="totals" variants={list}>
            <Stat value={nf.format(Math.floor(ms / MS.w))} label="weeks" lift />
            <Stat value={nf.format(Math.floor(ms / MS.d))} label="days" lift />
            <Stat value={nf.format(Math.floor(ms / MS.m))} label="minutes" lift />
            <Stat value={nf.format(Math.floor(ms / MS.s))} label="seconds" lift />
          </motion.dl>
        </motion.section>

        <motion.section className="block" variants={rise}>
          <h2>Dates</h2>
          <motion.dl className="facts" variants={list}>
            <Stat value={wallBirth.toLocaleDateString("en-US", { weekday: "long" })} label="day you were born" lift />
            <Stat value={`${nf.format(daysToBirthday)} days`} label={`until you turn ${nbWall.getFullYear() - wallBirth.getFullYear()}`} lift />
            <Stat value={fmtDate(nbWall)} label="next birthday" lift />
          </motion.dl>
        </motion.section>
      </div>
    </motion.div>
  );
}
