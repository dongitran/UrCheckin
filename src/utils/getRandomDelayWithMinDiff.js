import LastDelay from "../models/lastDelay.model.js";

export async function getRandomDelayWithMinDiff(min, max, checkTime, minDiff) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const lastDelayRecord = await LastDelay.findOne({
    checkTime: checkTime,
  }).sort({ createdAt: -1 });

  let newDelay;
  const lastDelay = lastDelayRecord ? lastDelayRecord.delay : null;

  if (lastDelay) {
    const lowerBound = Math.max(min, Math.abs(lastDelay - minDiff));
    const upperBound = Math.min(max, lastDelay + minDiff);

    const randomFactor = Math.random() * 300 - 200;
    if (Math.random() < 0.5) {
      newDelay = Math.floor(
        Math.random() * (lastDelay - lowerBound) + lowerBound + randomFactor
      );
    } else {
      newDelay = Math.floor(
        Math.random() * (upperBound - lastDelay) + lastDelay + randomFactor
      );
    }

    if (Math.abs(newDelay - lastDelay) < minDiff) {
      if (lastDelay + minDiff <= max) {
        newDelay = lastDelay + minDiff + Math.floor(Math.random() * 30);
      } else {
        newDelay = lastDelay - minDiff - Math.floor(Math.random() * 30);
      }
    }
  } else {
    newDelay = Math.floor(Math.random() * (max - min) + min);
  }

  await LastDelay.create({
    date: todayISO,
    checkTime: checkTime,
    delay: newDelay,
  });

  return newDelay * 1000;
}
