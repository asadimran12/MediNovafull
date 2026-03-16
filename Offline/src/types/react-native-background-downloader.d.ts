declare module '@kesha-antonov/react-native-background-downloader' {
  export interface DownloadTaskInfo {
    id: string;
    url: string;
    destination: string;
    headers?: Record<string, string>;
  }

  export interface DownloadTask {
    id: string;
    state: 'DOWNLOADING' | 'PAUSED' | 'DONE' | 'FAILED' | 'STOPPED';
    percent: number;
    bytesWritten: number;
    totalBytes: number;

    begin(callback: (expectedBytes: number) => void): DownloadTask;
    progress(callback: (percent: number, bytesWritten: number, totalBytes: number) => void): DownloadTask;
    done(callback: () => void): DownloadTask;
    error(callback: (error: any) => void): DownloadTask;

    pause(): void;
    resume(): void;
    stop(): void;
  }

  export interface RNBackgroundDownloaderStatic {
    download(options: DownloadTaskInfo): DownloadTask;
    checkForExistingDownloads(): Promise<DownloadTask[]>;
    directories: {
      documents: string;
    };
  }

  const RNBackgroundDownloader: RNBackgroundDownloaderStatic;
  export default RNBackgroundDownloader;
}
