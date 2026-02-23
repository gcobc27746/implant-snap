declare module 'screenshot-desktop' {
  type ScreenshotOptions = {
    format?: 'jpg' | 'png'
    filename?: string
    linuxLibrary?: 'scrot' | 'imagemagick'
    screen?: string
  }

  function screenshot(options?: ScreenshotOptions): Promise<Buffer>

  export default screenshot
}
