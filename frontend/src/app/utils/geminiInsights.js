// Gemini API integration for focus insights and recommendations
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

/**
 * Analyze session data and generate insights using Gemini
 * @param {Object} sessionData - Session data from localStorage
 * @returns {Promise<Object>} Insights and recommendations
 */
export async function generateFocusInsights(sessionData) {
  if (!GEMINI_API_KEY) {
    console.error('Gemini API key not configured');
    return getFallbackInsights(sessionData);
  }

  try {
    // Prepare session summary for analysis
    const sessionSummary = prepareSessionSummary(sessionData);
    
    const prompt = `
    As a focus and productivity expert, analyze this EEG-based focus session data and provide personalized insights and recommendations.

    Session Data:
    ${JSON.stringify(sessionSummary, null, 2)}

    Please provide:
    1. **Key Insights** (2-3 bullet points about their focus patterns)
    2. **Strengths** (What they did well)
    3. **Areas for Improvement** (Specific, actionable suggestions)
    4. **Personalized Recommendations** (2-3 specific strategies based on their data)
    5. **Focus Score Interpretation** (What their ${sessionSummary.avgFocusPercentage}% focus means)

    Format the response as JSON with these keys:
    {
      "insights": ["insight1", "insight2", "insight3"],
      "strengths": ["strength1", "strength2"],
      "improvements": ["improvement1", "improvement2"],
      "recommendations": ["recommendation1", "recommendation2", "recommendation3"],
      "scoreInterpretation": "interpretation text",
      "motivationalMessage": "encouraging message"
    }

    Base your analysis on:
    - Focus percentage trends
    - Duration of focused vs unfocused periods
    - Pattern of distractions
    - Time of day performance
    - Task switching frequency
    `;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE"
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.candidates[0]?.content?.parts[0]?.text;
    
    if (!generatedText) {
      throw new Error('No response from Gemini');
    }

    // Parse the JSON response
    try {
      // Extract JSON from the response (it might be wrapped in markdown)
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const insights = JSON.parse(jsonMatch[0]);
        return {
          ...insights,
          generated: true,
          timestamp: Date.now()
        };
      }
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      // Fall back to text parsing if JSON parsing fails
      return parseTextResponse(generatedText, sessionSummary);
    }

    return getFallbackInsights(sessionData);
  } catch (error) {
    console.error('Error generating insights:', error);
    return getFallbackInsights(sessionData);
  }
}

/**
 * Prepare session data summary for LLM analysis
 */
function prepareSessionSummary(sessionData) {
  if (!sessionData || !sessionData.intervals) {
    return {
      error: 'Invalid session data',
      avgFocusPercentage: 0
    };
  }

  const workIntervals = sessionData.intervals.filter(i => i.kind === 'work');
  const allSamples = workIntervals.flatMap(i => i.samples || []);
  
  // Calculate focus metrics
  const focusedSamples = allSamples.filter(s => s.focused);
  const avgFocusPercentage = allSamples.length > 0 
    ? Math.round((focusedSamples.length / allSamples.length) * 100)
    : 0;

  // Calculate focus/distraction streaks
  let currentStreak = { focused: null, count: 0, startTime: null };
  let streaks = [];
  
  allSamples.forEach((sample, index) => {
    if (currentStreak.focused === null || currentStreak.focused !== sample.focused) {
      if (currentStreak.count > 0) {
        streaks.push({
          ...currentStreak,
          endTime: sample.timestamp,
          duration: sample.timestamp - currentStreak.startTime
        });
      }
      currentStreak = {
        focused: sample.focused,
        count: 1,
        startTime: sample.timestamp
      };
    } else {
      currentStreak.count++;
    }
  });

  // Add the last streak
  if (currentStreak.count > 0 && allSamples.length > 0) {
    streaks.push({
      ...currentStreak,
      endTime: allSamples[allSamples.length - 1].timestamp,
      duration: allSamples[allSamples.length - 1].timestamp - currentStreak.startTime
    });
  }

  const focusStreaks = streaks.filter(s => s.focused);
  const distractionStreaks = streaks.filter(s => !s.focused);

  // Time-based analysis
  const sessionDuration = sessionData.endedAt - sessionData.startedAt;
  const sessionDate = new Date(sessionData.startedAt);
  
  return {
    sessionId: sessionData.id,
    date: sessionDate.toLocaleDateString(),
    timeOfDay: sessionDate.getHours() < 12 ? 'morning' : sessionDate.getHours() < 17 ? 'afternoon' : 'evening',
    durationMinutes: Math.round(sessionDuration / 60000),
    avgFocusPercentage,
    totalSamples: allSamples.length,
    focusedSamples: focusedSamples.length,
    unfocusedSamples: allSamples.length - focusedSamples.length,
    avgConfidence: focusedSamples.length > 0 
      ? (focusedSamples.reduce((sum, s) => sum + s.confidence, 0) / focusedSamples.length).toFixed(2)
      : 0,
    longestFocusStreak: focusStreaks.length > 0 
      ? Math.max(...focusStreaks.map(s => s.duration)) / 1000 
      : 0,
    longestDistractionStreak: distractionStreaks.length > 0
      ? Math.max(...distractionStreaks.map(s => s.duration)) / 1000
      : 0,
    totalFocusStreaks: focusStreaks.length,
    totalDistractionStreaks: distractionStreaks.length,
    avgFocusStreakDuration: focusStreaks.length > 0
      ? (focusStreaks.reduce((sum, s) => sum + s.duration, 0) / focusStreaks.length / 1000).toFixed(1)
      : 0,
    avgDistractionDuration: distractionStreaks.length > 0
      ? (distractionStreaks.reduce((sum, s) => sum + s.duration, 0) / distractionStreaks.length / 1000).toFixed(1)
      : 0,
    stateTransitions: streaks.length - 1
  };
}

/**
 * Parse text response if JSON parsing fails
 */
function parseTextResponse(text, sessionSummary) {
  // Basic text parsing fallback
  return {
    insights: [
      `Your average focus was ${sessionSummary.avgFocusPercentage}%`,
      `You had ${sessionSummary.totalFocusStreaks} focused periods`,
      `Session lasted ${sessionSummary.durationMinutes} minutes`
    ],
    strengths: [
      sessionSummary.avgFocusPercentage > 70 ? "Strong overall focus" : "Room for improvement",
      sessionSummary.longestFocusStreak > 300 ? "Good sustained focus periods" : "Building focus endurance"
    ],
    improvements: [
      sessionSummary.avgDistractionDuration > 30 ? "Reduce distraction duration" : "Quick recovery from distractions",
      sessionSummary.stateTransitions > 20 ? "Minimize task switching" : "Good focus stability"
    ],
    recommendations: [
      "Try the Pomodoro technique for better focus intervals",
      "Take regular breaks to maintain concentration",
      "Minimize distractions in your environment"
    ],
    scoreInterpretation: `A ${sessionSummary.avgFocusPercentage}% focus score indicates ${
      sessionSummary.avgFocusPercentage > 80 ? "excellent" : 
      sessionSummary.avgFocusPercentage > 60 ? "good" : 
      sessionSummary.avgFocusPercentage > 40 ? "moderate" : "developing"
    } concentration levels.`,
    motivationalMessage: "Keep practicing mindful focus techniques to improve your concentration!",
    generated: false,
    timestamp: Date.now()
  };
}

/**
 * Fallback insights when API is unavailable
 */
function getFallbackInsights(sessionData) {
  const summary = prepareSessionSummary(sessionData);
  
  // Generate rule-based insights
  const insights = [];
  const strengths = [];
  const improvements = [];
  const recommendations = [];
  
  // Analyze focus percentage
  if (summary.avgFocusPercentage >= 80) {
    insights.push("Excellent focus performance - you maintained concentration for most of the session");
    strengths.push("Outstanding ability to maintain deep focus");
  } else if (summary.avgFocusPercentage >= 60) {
    insights.push("Good focus levels with some room for improvement");
    strengths.push("Solid baseline focus ability");
    improvements.push("Work on extending focus periods");
  } else if (summary.avgFocusPercentage >= 40) {
    insights.push("Moderate focus levels - consider environmental optimizations");
    improvements.push("Reduce frequency of distractions");
    recommendations.push("Try noise-cancelling headphones or a quieter workspace");
  } else {
    insights.push("Focus was challenging this session - let's identify the barriers");
    improvements.push("Identify and eliminate major distraction sources");
    recommendations.push("Start with shorter focus intervals and gradually increase");
  }
  
  // Analyze streaks
  if (summary.longestFocusStreak > 600) { // 10+ minutes
    strengths.push(`Impressive ${Math.round(summary.longestFocusStreak / 60)}-minute focus streak`);
  } else if (summary.longestFocusStreak > 300) { // 5+ minutes
    insights.push("You achieved some good focus streaks");
  } else {
    improvements.push("Work on sustaining focus for longer periods");
    recommendations.push("Practice meditation to improve sustained attention");
  }
  
  // Analyze distraction recovery
  if (summary.avgDistractionDuration < 20) {
    strengths.push("Quick recovery from distractions");
  } else if (summary.avgDistractionDuration > 60) {
    improvements.push("Faster refocusing after distractions needed");
    recommendations.push("Use a refocusing ritual (deep breath, affirmation) when distracted");
  }
  
  // Time of day insights
  if (summary.timeOfDay === 'morning') {
    insights.push("Morning session - typically optimal for deep work");
  } else if (summary.timeOfDay === 'afternoon') {
    insights.push("Afternoon session - consider if this is your peak focus time");
  } else {
    insights.push("Evening session - ensure adequate lighting and minimize fatigue");
  }
  
  // State transitions
  if (summary.stateTransitions > 30) {
    improvements.push("High number of focus state changes detected");
    recommendations.push("Minimize interruptions and batch similar tasks");
  } else if (summary.stateTransitions < 10) {
    strengths.push("Stable focus states with minimal switching");
  }
  
  // Score interpretation
  const scoreInterpretation = `Your ${summary.avgFocusPercentage}% focus score ${
    summary.avgFocusPercentage >= 80 ? "is exceptional! You're in the top tier of focus performance." :
    summary.avgFocusPercentage >= 60 ? "shows good concentration ability with potential for growth." :
    summary.avgFocusPercentage >= 40 ? "indicates developing focus skills. Consistent practice will improve this." :
    "suggests significant room for improvement. Don't be discouraged - focus is a trainable skill!"
  }`;
  
  // Motivational message based on performance
  const motivationalMessage = 
    summary.avgFocusPercentage >= 70 ? 
      "Outstanding work! Your brain is firing on all cylinders. Keep up this excellent focus discipline!" :
    summary.avgFocusPercentage >= 50 ?
      "You're making good progress! Each session strengthens your focus muscles. Keep pushing forward!" :
      "Every session is a step toward better focus. You're building important neural pathways - stay committed!";
  
  return {
    insights: insights.slice(0, 3),
    strengths: strengths.slice(0, 2),
    improvements: improvements.slice(0, 2),
    recommendations: recommendations.slice(0, 3),
    scoreInterpretation,
    motivationalMessage,
    generated: false,
    fallback: true,
    timestamp: Date.now(),
    summary
  };
}

/**
 * Generate insights for multiple sessions (trends)
 */
export async function generateTrendInsights(sessions) {
  if (!sessions || sessions.length === 0) {
    return null;
  }

  const summaries = sessions.map(s => prepareSessionSummary(s));
  const validSummaries = summaries.filter(s => !s.error);
  
  if (validSummaries.length === 0) {
    return null;
  }

  // Calculate trends
  const avgFocus = validSummaries.reduce((sum, s) => sum + s.avgFocusPercentage, 0) / validSummaries.length;
  const totalMinutes = validSummaries.reduce((sum, s) => sum + s.durationMinutes, 0);
  const recentSessions = validSummaries.slice(-5);
  const recentAvgFocus = recentSessions.reduce((sum, s) => sum + s.avgFocusPercentage, 0) / recentSessions.length;
  
  const trend = recentAvgFocus > avgFocus ? 'improving' : 
                recentAvgFocus < avgFocus ? 'declining' : 'stable';
  
  return {
    overallAvgFocus: Math.round(avgFocus),
    recentAvgFocus: Math.round(recentAvgFocus),
    totalSessions: sessions.length,
    totalMinutes,
    trend,
    trendMessage: trend === 'improving' ? 
      "Your focus is improving! Keep up the great work." :
      trend === 'declining' ? 
      "Your focus has dipped recently. Consider what might have changed." :
      "Your focus levels are consistent. Try new techniques to break through.",
    bestSession: validSummaries.reduce((best, s) => 
      s.avgFocusPercentage > (best?.avgFocusPercentage || 0) ? s : best, null
    ),
    timestamp: Date.now()
  };
}
