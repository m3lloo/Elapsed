import { motion } from "motion/react";
import { Heart, Orbit, Rocket, Sparkles, Wind } from "lucide-react";
import { funFacts } from "../lib/time";
import { nf, nfCompact } from "../lib/format";
import { Ic } from "./Icon";
import { cell, list, rise } from "./Parts";

/** Bento of four, each fed by published averages. Labeled as estimates in the footnote. */
export function Facts({ ms }: { ms: number }) {
  const f = funFacts(ms);
  return (
    <motion.section className="block" variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }}>
      <h2 className="h-icon"><Ic icon={Sparkles} /> By the numbers</h2>
      <motion.div className="bento" variants={list}>
        <motion.div className="bento-cell b-heart" variants={cell}>
          <Ic icon={Heart} size={22} />
          <p className="b-num">{nf.format(Math.floor(f.heartbeats))}</p>
          <p className="b-label">heartbeats, at about 80 a minute</p>
        </motion.div>
        <motion.div className="bento-cell b-planets" variants={cell}>
          <Ic icon={Orbit} size={22} />
          <p className="b-label">Your age in other years</p>
          <ul>
            <li><span>Mercury</span><b>{f.mercury.toFixed(1)}</b></li>
            <li><span>Mars</span><b>{f.mars.toFixed(1)}</b></li>
            <li><span>Jupiter</span><b>{f.jupiter.toFixed(2)}</b></li>
          </ul>
        </motion.div>
        <motion.div className="bento-cell" variants={cell}>
          <Ic icon={Wind} size={22} />
          <p className="b-num">{nfCompact.format(f.breaths)}</p>
          <p className="b-label">breaths, at about 16 a minute</p>
        </motion.div>
        <motion.div className="bento-cell" variants={cell}>
          <Ic icon={Rocket} size={22} />
          <p className="b-num">{nfCompact.format(f.orbitKm)} km</p>
          <p className="b-label">traveled with Earth around the Sun</p>
        </motion.div>
      </motion.div>
      <p className="muted small">Estimates from population averages, not measurements of you.</p>
    </motion.section>
  );
}
