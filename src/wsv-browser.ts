/* (C) Stefan John / Stenway / WhitespaceSV.com / 2022 */

import { WsvDocument } from "./wsv.js"

// ----------------------------------------------------------------------

export abstract class WsvDownload {
	static getDownloadUrl(document: WsvDocument): string {
		let bytes: Uint8Array = document.getBytes()
		let blob: Blob = new Blob([bytes], { type: 'text/plain' })
		return URL.createObjectURL(blob)
	}
	
	static download(wsvDocument: WsvDocument, fileName: string) {
		const url = WsvDownload.getDownloadUrl(wsvDocument)
		let element = document.createElement('a')
		element.href = url
		element.download = fileName
		element.style.display = 'none'
		document.body.appendChild(element)
		element.click()
		document.body.removeChild(element)
	}
}