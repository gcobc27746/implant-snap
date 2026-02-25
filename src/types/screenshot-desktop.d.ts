declare module 'screenshot-desktop' {
  interface ScreenshotOptions {
    format?: 'png' | 'jpg'
    screen?: string | number
    filename?: string
    linuxLibrary?: 'scrot' | 'imagemagick'
  }

  interface ScreenshotDisplay {
    id: string | number
    name?: string
    width?: number
    height?: number
    primary?: boolean
    [key: string]: unknown
  }

  function screenshot(options?: ScreenshotOptions): Promise<Buffer>

  namespace screenshot {
    function listDisplays(): Promise<ScreenshotDisplay[]>
  }

  export default screenshot
}
