import { pipeline, cos_sim, env } from '@xenova/transformers';

// Configure Xenova to use remote models from Hugging Face
env.allowRemoteModels = true;
env.allowLocalModels = false;
// Set CDN for faster model loading
env.remoteURL = 'https://huggingface.co/';
env.remotePathTemplate = '{model}/resolve/main/';

// Task categories with descriptive definitions for better classification
const CATEGORIES = {
  work: "Tasks related to job, projects, professional responsibilities, meetings, deadlines, and career development",
  study: "Tasks related to learning, courses, academic work, research, reading, studying, and educational activities",
  creative: "Tasks requiring imagination, design, artistic effort, writing, music, art, crafting, and creative projects",
  life: "Personal tasks, errands, chores, health, family, social activities, and general everyday life activities"
};

// Fallback keyword-based classification
const CATEGORY_KEYWORDS = {
  work: ['work', 'job', 'meeting', 'project', 'deadline', 'report', 'presentation', 'email', 'client', 'boss', 'office', 'business', 'professional', 'career', 'interview', 'proposal', 'budget', 'sales', 'marketing'],
  study: ['study', 'learn', 'course', 'exam', 'homework', 'assignment', 'research', 'read', 'book', 'lecture', 'class', 'university', 'college', 'school', 'education', 'tutorial', 'practice', 'review', 'notes'],
  creative: ['write', 'draw', 'paint', 'design', 'create', 'art', 'music', 'song', 'story', 'poem', 'craft', 'build', 'make', 'compose', 'sketch', 'photo', 'video', 'blog', 'creative'],
  life: ['buy', 'shop', 'grocery', 'clean', 'laundry', 'cook', 'eat', 'exercise', 'gym', 'doctor', 'appointment', 'family', 'friend', 'call', 'visit', 'personal', 'home', 'chore', 'errand']
};

// Category colors for UI
export const CATEGORY_COLORS = {
  work: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-200', border: 'border-blue-200 dark:border-blue-700' },
  study: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-200', border: 'border-green-200 dark:border-green-700' },
  creative: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-200', border: 'border-purple-200 dark:border-purple-700' },
  life: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-200', border: 'border-orange-200 dark:border-orange-700' }
};

class TaskClassifier {
  constructor() {
    this.model = null;
    this.categoryEmbeddings = null;
    this.isInitialized = false;
    this.initPromise = null;
  }

  async initialize() {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInitialize();
    await this.initPromise;
  }

  async _doInitialize() {
    try {
      console.log('Initializing task classifier with AI model...');
      
      // Load the sentence embedding model with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Model loading timeout')), 30000)
      );
      
      this.model = await Promise.race([
        pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2'),
        timeoutPromise
      ]);
      
      // Pre-compute embeddings for all categories
      this.categoryEmbeddings = {};
      for (const [category, description] of Object.entries(CATEGORIES)) {
        const embedding = await this.model(description, { pooling: 'mean', normalize: true });
        this.categoryEmbeddings[category] = embedding;
      }
      
      this.isInitialized = true;
      console.log('Task classifier initialized successfully with AI model');
    } catch (error) {
      console.warn('Failed to initialize AI model, will use keyword-based classification:', error.message);
      // Don't throw error, just mark as not initialized so we fall back to keywords
      this.isInitialized = false;
      this.model = null;
    }
  }

  async classifyTask(taskText) {
    // Try to initialize if not already done
    if (!this.isInitialized && !this.initPromise) {
      await this.initialize();
    }

    // If model is available, use AI classification
    if (this.isInitialized && this.model && this.categoryEmbeddings) {
      try {
        // Get embedding for the task
        const taskEmbedding = await this.model(taskText, { pooling: 'mean', normalize: true });
        
        // Calculate similarities with each category
        const similarities = {};
        let maxSimilarity = -1;
        let bestCategory = 'life'; // default fallback
        
        for (const [category, categoryEmbedding] of Object.entries(this.categoryEmbeddings)) {
          const similarity = cos_sim(taskEmbedding.data, categoryEmbedding.data);
          similarities[category] = similarity;
          
          if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            bestCategory = category;
          }
        }
        
        return {
          category: bestCategory,
          confidence: maxSimilarity,
          similarities: similarities,
          method: 'ai'
        };
      } catch (error) {
        console.error('Error classifying task with AI model:', error);
        // Fall back to keyword-based classification
        return this.classifyTaskByKeywords(taskText);
      }
    }

    // Fall back to keyword-based classification
    console.log('Using keyword-based classification (AI model not available)');
    return this.classifyTaskByKeywords(taskText);
  }

  // Fallback keyword-based classification
  classifyTaskByKeywords(taskText) {
    const text = taskText.toLowerCase();
    const scores = {};
    
    // Initialize scores
    for (const category of Object.keys(CATEGORY_KEYWORDS)) {
      scores[category] = 0;
    }
    
    // Count keyword matches
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          scores[category] += 1;
        }
      }
    }
    
    // Find best category
    let bestCategory = 'life';
    let maxScore = 0;
    
    for (const [category, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestCategory = category;
      }
    }
    
    return {
      category: bestCategory,
      confidence: maxScore > 0 ? 0.7 : 0.3, // Lower confidence for keyword matching
      similarities: scores,
      method: 'keywords'
    };
  }

  // Get category display name
  getCategoryDisplayName(category) {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  // Get all available categories
  getCategories() {
    return Object.keys(CATEGORIES);
  }
}

// Create a singleton instance
const taskClassifier = new TaskClassifier();

export default taskClassifier;

// Export utility functions
export const classifyTask = (taskText) => taskClassifier.classifyTask(taskText);
export const getCategoryDisplayName = (category) => taskClassifier.getCategoryDisplayName(category);
export const getCategories = () => taskClassifier.getCategories();
