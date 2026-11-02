import axios from 'axios';
import { useAppStore } from '../store/useAppStore';

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const { accessToken, language, incrementRequests } = useAppStore.getState();
  config.headers['Accept-Language'] = language;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  const isSilent = config.headers['X-Silent-Loading'] === 'true';
  if (!isSilent && !(config as any)._trackedLoading) {
    (config as any)._trackedLoading = true;
    incrementRequests();
  }
  return config;
});

let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

const flushQueue = (token: string | null) => {
  pendingQueue.forEach((cb) => cb(token));
  pendingQueue = [];
};

const settleTrackedRequest = (config: any) => {
  if (config && config._trackedLoading) {
    config._trackedLoading = false;
    useAppStore.getState().decrementRequests();
  }
};

// Section 3.1.A: Automatic Refresh Token Rotation Interceptor on 401
apiClient.interceptors.response.use(
  (response) => {
    settleTrackedRequest(response.config);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/Auth/login') &&
      !originalRequest.url?.includes('/Auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push((newToken) => {
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              resolve(apiClient(originalRequest));
            } else {
              settleTrackedRequest(originalRequest);
              reject(error);
            }
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await axios.post('/api/Auth/refresh', {}, { withCredentials: true });
        const { accessToken, user } = refreshRes.data;
        useAppStore.getState().setCurrentUser(user, accessToken);
        flushQueue(accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        flushQueue(null);
        settleTrackedRequest(originalRequest);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    settleTrackedRequest(originalRequest);
    return Promise.reject(error);
  }
);
