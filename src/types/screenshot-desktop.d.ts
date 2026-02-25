declare module 'screenshot-desktop' {
  interface ScreenshotOptions {
    format?: 'png' | 'jpg'
    screen?: string | number
    filename?: string
    linuxLibrary?: 'scrot' | 'imagemagick'
  }

  function screenshot(options?: ScreenshotOptions): Promise<Buffer>
  export default screenshot
}
