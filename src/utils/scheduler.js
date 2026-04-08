/**
 * A basic scheduler algorithm to sort tasks dynamically based on:
 * 1. Priority (High, Medium, Low)
 * 2. Deadline (Earlier deadlines first)
 * 3. Status (Missed tasks get shifted and sometimes re-prioritized)
 */

export const PRIORITY_WEIGHTS = {
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Learning Velocity Tracker
 * Maps 'Subject' -> Speed Multiplier
 * e.g., Math: 0.8 means the user finishes Math 20% faster than estimated.
 */
export const ACTIVITY_MODIFIERS = {
  "Physics": 0.8,      // Example: User is 20% faster at Physics
  "Mathematics": 1.25  // Example: User is 25% slower at Mathematics
};

export const updateActivityModifier = (subject, estimated, actual) => {
  const currentMod = ACTIVITY_MODIFIERS[subject] || 1;
  const matchMod = actual / estimated;
  // Blend historical average with new data (moving average)
  ACTIVITY_MODIFIERS[subject] = (currentMod + matchMod) / 2;
};

/**
 * Generates a smart suggestion predicting how much material the user can cover based on their velocity.
 */
export const getSuggestionForSubject = (subject, estimatedHours) => {
  if (!estimatedHours || estimatedHours <= 0) return null;
  const velocity = ACTIVITY_MODIFIERS[subject];
  if (!velocity || velocity === 1) return null; // No suggestion needed if no data or exactly average

  if (velocity < 1) {
    // Faster
    const speedPercent = Math.round((1 - velocity) * 100);
    const capacity = (estimatedHours / velocity).toFixed(1);
    return {
      type: 'positive',
      text: `⚡ You learn ${subject} ${speedPercent}% faster! In ${estimatedHours}h, you can realistically cover ~${capacity}h of standard syllabus.`
    };
  } else {
    // Slower
    const slowPercent = Math.round((velocity - 1) * 100);
    const needed = (estimatedHours * velocity).toFixed(1);
    return {
      type: 'warning',
      text: `⚠️ You usually take ${slowPercent}% longer for ${subject}. Consider allocating ~${needed}h to comfortably cover ${estimatedHours}h of material.`
    };
  }
};

/**
 * Calculates a score for sorting tasks. Higher score = higher priority in schedule.
 * @param {Object} task 
 * @returns {number}
 */
export const calculateTaskScore = (task) => {
  const priorityScore = PRIORITY_WEIGHTS[task.priority] || 1;
  
  // Calculate days until deadline. If passed, score becomes extremely high to prioritize.
  const timeDiff = new Date(task.deadline) - new Date();
  const daysUntilDeadline = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  
  const urgencyScore = daysUntilDeadline <= 0 ? 10 : (10 / daysUntilDeadline);

  // Missed tasks also gain a bump in priority to push them ahead
  const missedBump = task.status === 'missed' ? 5 : 0;

  return priorityScore + urgencyScore + missedBump;
};

export const generateSchedule = (tasks, dailyHours = 4, startHour = 17) => {
  // Filter out completed tasks
  const pendingTasks = tasks.filter(t => t.status !== 'completed');

  // Currently ignoring fixed tasks complex slotting for a pure queue-based gap packing per user request
  const sortedTasks = pendingTasks.sort((a, b) => calculateTaskScore(b) - calculateTaskScore(a));

  const schedule = [];
  
  let timeCursor = new Date();
  
  // Snap to current roughly or upcoming hour if before startHour
  const snapCursor = (cursor) => {
    let copy = new Date(cursor);
    const h = copy.getHours();
    
    // round exactly up to next 5 minutes for clean UI starting times if it's currently during study time
    const remainder = copy.getMinutes() % 5;
    if (remainder > 0) {
      copy.setMinutes(copy.getMinutes() + (5 - remainder));
    }
    copy.setSeconds(0, 0);

    if (h < startHour) {
      copy.setHours(startHour, 0, 0, 0);
    } else if (h >= startHour + dailyHours) {
      // Past today's study window
      copy.setDate(copy.getDate() + 1);
      copy.setHours(startHour, 0, 0, 0);
    }
    return copy;
  };

  timeCursor = snapCursor(timeCursor);

  sortedTasks.forEach(task => {
    let taskMinutesLeft = Math.round(task.estimatedHours * 60);
    if (taskMinutesLeft <= 0) return;

    while (taskMinutesLeft > 0) {
      let endOfDay = new Date(timeCursor);
      endOfDay.setHours(startHour + dailyHours, 0, 0, 0);
      
      let maxAvailableMins = (endOfDay - timeCursor) / 60000;
      
      if (maxAvailableMins <= 0) {
        timeCursor.setDate(timeCursor.getDate() + 1);
        timeCursor.setHours(startHour, 0, 0, 0);
        continue;
      }
      
      let minsToAllocate = Math.min(taskMinutesLeft, maxAvailableMins);
      
      let blockStartDate = new Date(timeCursor);
      let blockEndDate = new Date(timeCursor);
      blockEndDate.setMinutes(blockEndDate.getMinutes() + minsToAllocate);
      
      const sh = String(blockStartDate.getHours()).padStart(2, '0');
      const sm = String(blockStartDate.getMinutes()).padStart(2, '0');
      const eh = String(blockEndDate.getHours()).padStart(2, '0');
      const em = String(blockEndDate.getMinutes()).padStart(2, '0');

      schedule.push({
        taskId: task.id,
        subject: task.subject,
        topic: task.topic,
        allocatedHours: minsToAllocate / 60,
        date: blockStartDate,
        startTime: `${sh}:${sm}`,
        endTime: `${eh}:${em}`,
        priority: task.priority,
        status: task.status,
        isFixed: !!task.isFixed
      });
      
      taskMinutesLeft -= minsToAllocate;
      
      // Advance by allocation + 15 minute gap as requested!
      timeCursor.setMinutes(timeCursor.getMinutes() + minsToAllocate + 15);
      
      // If the gap pushes us exactly to or past the end of the day, snap logic happens next loop
      if (timeCursor.getHours() >= startHour + dailyHours || 
         (timeCursor.getHours() === startHour + dailyHours && timeCursor.getMinutes() > 0)) {
         timeCursor.setDate(timeCursor.getDate() + 1);
         timeCursor.setHours(startHour, 0, 0, 0);
      }
    }
  });

  // Calculate gaps to add explicit Free Slots so the user can accurately see available schedule times.
  let freeCursor = schedule.length > 0 ? new Date(schedule[schedule.length - 1].date) : new Date();
  
  // We want to at least ensure we show free slots for today and tomorrow.
  const now = new Date();
  freeCursor = new Date(Math.max(now.getTime(), freeCursor.getTime()));
  
  // Create a max threshold line of current day only out
  const thresholdDays = 0;
  const maxFreeDay = new Date(now);
  maxFreeDay.setDate(now.getDate() + thresholdDays);
  maxFreeDay.setHours(startHour + dailyHours, 0, 0, 0);

  // Group existing bounds to avoid overlapping explicitly created free blocks
  const existingIntervals = schedule.map(s => {
    return {
       start: new Date(`${s.date.toDateString()} ${s.startTime}`),
       end: new Date(`${s.date.toDateString()} ${s.endTime}`)
    };
  });

  // Small helper to add free slot
  const generateFreeSlot = (tCurrent, minutes) => {
    const endT = new Date(tCurrent);
    endT.setMinutes(endT.getMinutes() + minutes);
    
    const sh = String(tCurrent.getHours()).padStart(2, '0');
    const sm = String(tCurrent.getMinutes()).padStart(2, '0');
    const eh = String(endT.getHours()).padStart(2, '0');
    const em = String(endT.getMinutes()).padStart(2, '0');

    schedule.push({
      taskId: `free-${tCurrent.getTime()}`,
      subject: "Free Time",
      topic: "Ready to occupy",
      allocatedHours: minutes / 60,
      date: new Date(tCurrent),
      startTime: `${sh}:${sm}`,
      endTime: `${eh}:${em}`,
      priority: 'low',
      status: 'free',
      isFreeSlot: true
    });
  };

  // Run a crawler across the entire threshold range and drop explicit free slot bricks
  let crawler = new Date(now);
  // snap crawler cleanly
  const rem = crawler.getMinutes() % 5;
  if (rem > 0) crawler.setMinutes(crawler.getMinutes() + (5 - rem));
  crawler.setSeconds(0, 0);

  while (crawler < maxFreeDay) {
    const h = crawler.getHours();
    
    // Jump to study hours
    if (h < startHour) {
      crawler.setHours(startHour, 0, 0, 0);
      continue;
    } else if (h >= startHour + dailyHours) {
      crawler.setDate(crawler.getDate() + 1);
      crawler.setHours(startHour, 0, 0, 0);
      continue;
    }

    // Now crawler is inside study block. Is it overlapping?
    const overlap = existingIntervals.find(iv => crawler >= iv.start && crawler < iv.end);
    if (overlap) {
      crawler = new Date(overlap.end);
      // add a 15 min gap margin naturally
      crawler.setMinutes(crawler.getMinutes() + 15);
      continue;
    }

    // Not overlapping! Find how long it is free until the next overlap or end of study day
    let endOfBlock = new Date(crawler);
    endOfBlock.setHours(startHour + dailyHours, 0, 0, 0);

    const nextOverlap = existingIntervals
      .filter(iv => iv.start > crawler && iv.start < endOfBlock)
      .sort((a,b) => a.start - b.start)[0];
    
    if (nextOverlap) {
      endOfBlock = new Date(nextOverlap.start);
    }
    
    const freeMins = (endOfBlock - crawler) / 60000;
    if (freeMins >= 15) {
      // Chunk free time into 1-hour blocks for visual cleanliness, or exact remainder
      let minutesToAllocate = Math.min(freeMins, 60);
      generateFreeSlot(crawler, minutesToAllocate);
      crawler.setMinutes(crawler.getMinutes() + minutesToAllocate);
    } else {
      crawler.setMinutes(crawler.getMinutes() + Math.max(freeMins, 1));
    }
  }

  // Final sort to organize properly by time
  schedule.sort((a,b) => a.date - b.date || a.startTime.localeCompare(b.startTime));

  return schedule;
};
