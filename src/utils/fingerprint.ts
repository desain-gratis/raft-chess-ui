"use client";
/* global WEBGL_debug_renderer_info */

type FingerprintMap = Record<string, string>;

type ScreenInfo = {
    width: number;
    height: number;
    colorDepth: number;
    availWidth: number;
    availHeight: number;
};

type WebGLInfo =
    | {
        unmaskedRenderer: string;
        unmaskedVendor: string;
    }
    | "NA"
    | "ERR";

type WorkerInfo = {
    webGLVendor: string;
    webGLRenderer: string;
    userAgent: string;
    languages: string;
    platform: string;
    hardwareConcurrency: number | string;
    cdp: boolean | string;
};

type CanvasInfo = {
    hash: string;
    hasAntiCanvasExtension: boolean;
    hasCanvasBlocker: boolean;
};

class FingerprintCollector {
    private fingerprint: FingerprintMap = {};
    private encryptionKey: string;

    constructor() {
        if (typeof window === "undefined") {
            this.encryptionKey = "";
            return;
        }

        this.encryptionKey =
            process.env.NEXT_PUBLIC_FP_KEY || "fallback_key_32_chars_minimum!!";
    }


    async collect(): Promise<string> {
        if (typeof window === "undefined") {
            throw new Error("FingerprintCollector must run on client");
        }

        await this.safeCollectSignal("userAgent", () => navigator.userAgent);
        await this.safeCollectSignal("screen", () => this.collectScreenInfo());

        await this.safeCollectSignal("cpuCores", () => navigator.hardwareConcurrency);
        await this.safeCollectSignal("deviceMemory", () => (navigator as any).deviceMemory);
        await this.safeCollectSignal("maxTouchPoints", () => navigator.maxTouchPoints);

        await this.safeCollectSignal("language", () => navigator.language);
        await this.safeCollectSignal("languages", () => JSON.stringify(navigator.languages));
        await this.safeCollectSignal("timezone", () =>
            Intl?.DateTimeFormat()?.resolvedOptions()?.timeZone
        );
        await this.safeCollectSignal("platform", () => navigator.platform);
        await this.safeCollectSignal("webdriver", () => navigator.webdriver);
        await this.safeCollectSignal("playwright", () =>
            "__pwInitScripts" in window || "__playwright__binding__" in window
        );

        await this.safeCollectSignal("webgl", () => this.collectWebGLInfo());
        await this.safeCollectSignal("canvas", () => this.collectCanvasInfo());
        await this.safeCollectSignal("cdp", () => this.collectCDPInfo());
        await this.safeCollectSignal("worker", () => this.collectWorkerInfo());

        await this.safeCollectSignal("timestamp", () => new Date().toISOString());

        return btoa(JSON.stringify(this.fingerprint));
    }

    private async safeCollectSignal(
        key: string,
        fn: () => any
    ): Promise<any> {
        try {
            const value = await fn();

            const encryptedKey = await this.encryptString(
                key,
                this.encryptionKey
            );
            const encryptedValue = await this.encryptString(
                JSON.stringify(value),
                this.encryptionKey
            );

            this.fingerprint[encryptedKey] = encryptedValue;
            return value;
        } catch {
            const encryptedKey = await this.encryptString(
                key,
                this.encryptionKey
            );
            const encryptedValue = await this.encryptString(
                "ERROR",
                this.encryptionKey
            );

            this.fingerprint[encryptedKey] = encryptedValue;
            return "ERROR";
        }
    }

    private async encryptString(str: string, key: string): Promise<string> {
        try {
            const paddedKey =
                key.length >= 32 ? key.slice(0, 32) : key + "0".repeat(32 - key.length);

            const keyBytes = new TextEncoder().encode(paddedKey);
            const iv = crypto.getRandomValues(new Uint8Array(12));

            const cryptoKey = await crypto.subtle.importKey(
                "raw",
                keyBytes,
                { name: "AES-GCM" },
                false,
                ["encrypt"]
            );

            const encryptedData = await crypto.subtle.encrypt(
                { name: "AES-GCM", iv },
                cryptoKey,
                new TextEncoder().encode(str)
            );

            const combined = new Uint8Array(iv.length + encryptedData.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encryptedData), iv.length);

            return btoa(String.fromCharCode(...combined));
        } catch {
            return "ERROR";
        }
    }

    private collectScreenInfo(): ScreenInfo {
        return {
            width: screen.width,
            height: screen.height,
            colorDepth: screen.colorDepth,
            availWidth: screen.availWidth,
            availHeight: screen.availHeight,
        };
    }

    private collectWebGLInfo(): WebGLInfo {
        try {
            const canvas = document.createElement("canvas");

            const gl =
                canvas.getContext("webgl") ||
                canvas.getContext("experimental-webgl");

            if (!gl || !(gl instanceof WebGLRenderingContext)) {
                return "NA";
            }

            let unmaskedRenderer = "NA";
            let unmaskedVendor = "NA";

            const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");

            if (debugInfo) {
                unmaskedRenderer = gl.getParameter(
                    (debugInfo as any).UNMASKED_RENDERER_WEBGL
                );
                unmaskedVendor = gl.getParameter(
                    (debugInfo as any).UNMASKED_VENDOR_WEBGL
                );
            }

            return { unmaskedRenderer, unmaskedVendor };
        } catch {
            return "ERR";
        }
    }

    private async collectWorkerInfo(): Promise<WorkerInfo> {
        const workerData: WorkerInfo = {
            webGLVendor: "NA",
            webGLRenderer: "NA",
            userAgent: "NA",
            languages: "NA",
            platform: "NA",
            hardwareConcurrency: "NA",
            cdp: "NA",
        };

        return new Promise((resolve) => {
            try {
                const workerCode = String.raw`(${() => {
                    try {
                        const fingerprintWorker: any = {};
                        fingerprintWorker.userAgent = navigator.userAgent;
                        fingerprintWorker.languages = JSON.stringify(navigator.languages);
                        fingerprintWorker.hardwareConcurrency = navigator.hardwareConcurrency;
                        fingerprintWorker.platform = navigator.platform;

                        try {
                            fingerprintWorker.cdp = false;
                            const e = new Error();
                            Object.defineProperty(e, "stack", {
                                get() {
                                    fingerprintWorker.cdp = true;
                                    return "";
                                },
                            });
                            console.log(e);
                        } catch {
                            fingerprintWorker.cdp = "ERROR";
                        }

                        const canvas = new OffscreenCanvas(1, 1);
                        const gl = canvas.getContext("webgl");

                        if (!gl || !(gl instanceof WebGLRenderingContext)) {
                            return "NA";
                        }

                        try {
                            const ext = gl.getExtension("WEBGL_debug_renderer_info") as WEBGL_debug_renderer_info | null;

                            let unmaskedRenderer = "NA";
                            let unmaskedVendor = "NA";

                            if (ext) {
                                unmaskedRenderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
                                unmaskedVendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);

                            }
                            fingerprintWorker.unmaskedRenderer = unmaskedRenderer
                            fingerprintWorker.unmaskedVendor = unmaskedVendor
                        } catch {
                            fingerprintWorker.webGLVendor = "NA";
                            fingerprintWorker.webGLRenderer = "NA";
                        }

                        postMessage(fingerprintWorker);
                    } catch {
                        postMessage({});
                    }
                }})()`;

                const blob = new Blob([workerCode], { type: "application/javascript" });
                const worker = new Worker(URL.createObjectURL(blob));

                worker.onmessage = (e) => resolve({ ...workerData, ...e.data });
                worker.onerror = () => resolve(workerData);
            } catch {
                resolve(workerData);
            }
        });
    }

    private async collectCanvasInfo(): Promise<CanvasInfo> {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;

        ctx.textBaseline = "top";
        ctx.font = "14px Arial";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("Hello, world!", 2, 15);

        const dataURL = canvas.toDataURL();

        let hasAntiCanvasExtension = false;
        let hasCanvasBlocker = false;

        try {
            ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (e: any) {
            const stack = e?.stack || "";
            hasAntiCanvasExtension = stack.includes("chrome-extension");
            hasCanvasBlocker = stack.includes("nomnklagbgmgghhjidfhnoelnjfndfpd");
        }

        const hashBuffer = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(dataURL)
        );

        const hash = Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("")
            .slice(0, 8);

        return { hash, hasAntiCanvasExtension, hasCanvasBlocker };
    }

    private collectCDPInfo(): boolean {
        let hasCdp = false;

        const e = new Error();
        Object.defineProperty(e, "stack", {
            get() {
                hasCdp = true;
                return "";
            },
        });

        console.log(e);
        return hasCdp;
    }
}

export default FingerprintCollector;