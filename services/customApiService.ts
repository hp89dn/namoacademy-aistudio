/**
 * Custom API Service to replace GoogleGenAI SDK
 * This service provides a compatible interface for making API calls
 */

export interface GenerateContentRequest {
  model: string;
  contents: {
    parts: Array<{
      text?: string;
      inlineData?: {
        data: string;
        mimeType: string;
      };
    }>;
  };
  config?: {
    imageConfig?: {
      aspectRatio?: string;
      imageSize?: string;
    };
  };
}

export interface GenerateContentResponse {
  text?: string;
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          mimeType: string;
          data: string;
        };
        text?: string;
      }>;
    };
  }>;
}

export interface GenerateVideosRequest {
  model: string;
  prompt: string;
  image: {
    imageBytes: string;
    mimeType: string;
  };
  config: {
    numberOfVideos: number;
  };
}

export interface VideoOperation {
  done: boolean;
  response?: {
    generatedVideos?: Array<{
      video?: {
        uri: string;
      };
    }>;
  };
  name?: string;
}

export interface AutomateJobRequest {
  image_url: string;
  prompt: string;
}

export interface AutomateJobResponse {
  job_id: string;
  prompt: string;
  image_url: string;
  generated_image_url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface JobStatusResponse {
  job_id: string;
  prompt: string;
  image_url: string;
  generated_image_url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

class CustomApiService {
  private baseUrl: string;
  private automateApiBaseUrl: string;

  constructor() {
    // Configure your custom API base URL here
    this.baseUrl = process.env.CUSTOM_API_BASE_URL || 'https://namoacademy-e4bc7c0813e5.herokuapp.com/api';
    // Configure automate API base URL
    this.automateApiBaseUrl = process.env.AUTOMATE_API_BASE_URL || 'https://h1my1fq1g0.execute-api.us-east-1.amazonaws.com/prod';
  }

  /**
   * Generate content (text or images) using the custom API
   */
  async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
    
    const { model, contents, config } = request;
    
    // Simplified request payload
    const payload: any = {
      model,
      parts: contents.parts,
    };

    // Add image config if provided
    if (config?.imageConfig) {
      payload.aspectRatio = config.imageConfig.aspectRatio;
      if (config.imageConfig.imageSize) {
        payload.imageSize = config.imageConfig.imageSize;
      }
    }

    const url = `${this.baseUrl}/generateContent`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    // Transform response to match expected format
    const result: GenerateContentResponse = {
      candidates: data.candidates || [],
    };

    // Extract text if available
    if (data.candidates?.[0]?.content?.parts) {
      const textParts = data.candidates[0].content.parts
        .filter((p: any) => p.text)
        .map((p: any) => p.text)
        .join('');
      if (textParts) {
        result.text = textParts;
      }
    }

    return result;
  }

  /**
   * Generate videos using the custom API
   */
  async generateVideos(request: GenerateVideosRequest): Promise<VideoOperation> {
    const { model, prompt, image, config } = request;
    
    // Simplified request payload
    const payload = {
      model,
      prompt,
      image: image.imageBytes,
      mimeType: image.mimeType,
      numberOfVideos: config.numberOfVideos,
    };

    const url = `${this.baseUrl}/generateVideos`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Video generation request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    // Transform response to match expected format
    return {
      done: data.done || false,
      response: data.response,
      name: data.name,
    };
  }

  /**
   * Get video operation status
   */
  async getVideosOperation(request: { operation: VideoOperation }): Promise<VideoOperation> {
    const { operation } = request;
    
    if (!operation.name) {
      throw new Error("Operation name is required");
    }

    const url = `${this.baseUrl}/operations/${operation.name}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Get operation request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    // Transform response to match expected format
    return {
      done: data.done || false,
      response: data.response,
      name: data.name,
    };
  }

  /**
   * Generate image using the automate API
   * Submits a job and polls until completion
   */
  async generateImageAutomate(
    request: AutomateJobRequest,
    options?: {
      pollInterval?: number; // milliseconds between polls, default 2000
      maxPollAttempts?: number; // maximum number of poll attempts, default 150 (5 minutes at 2s interval)
      onProgress?: (progress: number, status: string) => void;
    }
  ): Promise<string> {
    const { image_url, prompt } = request;
    const pollInterval = options?.pollInterval || 2000;
    const maxPollAttempts = options?.maxPollAttempts || 150;

    // Step 1: Submit the job
    const automateUrl = `${this.automateApiBaseUrl}/create`;
    const submitResponse = await fetch(automateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image_url, prompt }),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      throw new Error(`Failed to submit job: ${submitResponse.status} ${submitResponse.statusText} - ${errorText}`);
    }

    const jobData: AutomateJobResponse = await submitResponse.json();
    
    if (!jobData.job_id) {
      throw new Error(`Job submission failed: No job_id returned`);
    }

    // Step 2: Poll for job completion
    const jobId = jobData.job_id;
    const jobUrl = `${this.automateApiBaseUrl}/job/${jobId}`;
    
    let attempts = 0;
    while (attempts < maxPollAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      const statusResponse = await fetch(jobUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        throw new Error(`Failed to check job status: ${statusResponse.status} ${statusResponse.statusText} - ${errorText}`);
      }

      const statusData: JobStatusResponse = await statusResponse.json();
      
      // Call progress callback if provided
      // Since the new API doesn't provide progress percentage, we estimate based on status
      if (options?.onProgress) {
        let estimatedProgress = 0;
        if (statusData.status === 'pending') {
          estimatedProgress = 10;
        } else if (statusData.status === 'processing') {
          estimatedProgress = 50;
        } else if (statusData.status === 'completed') {
          estimatedProgress = 100;
        }
        options.onProgress(estimatedProgress, statusData.status);
      }

      // Check if job is completed
      if (statusData.status === 'completed') {
        if (statusData.generated_image_url) {
          return statusData.generated_image_url;
        } else {
          throw new Error('Job completed but no generated image URL found');
        }
      }

      // Check if job failed
      if (statusData.status === 'failed') {
        throw new Error(`Job failed: Unknown error`);
      }

      attempts++;
    }

    throw new Error(`Job polling timeout: Job did not complete within ${maxPollAttempts * pollInterval / 1000} seconds`);
  }
}

/**
 * Create a new instance of the custom API service
 */
export function createCustomApiService() {
  return new CustomApiService();
}

