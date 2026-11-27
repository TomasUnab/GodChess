export type ClockState = { w:number; b:number };
export function tickClock(clock:ClockState, turn:'w'|'b', elapsedMs:number):ClockState { return {...clock,[turn]:Math.max(0,clock[turn]-elapsedMs)}; }
export function clockExpired(clock:ClockState){return clock.w===0||clock.b===0;}
export function formatClock(ms:number){const seconds=Math.ceil(ms/1000);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
