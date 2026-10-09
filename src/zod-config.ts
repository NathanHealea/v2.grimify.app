import { z } from "zod";

// public/_headers forbids eval. Without jitless, zod probes with `new Function("")` and the
// browser reports a CSP violation even though zod catches the error (DECISIONS 042).
z.config({ jitless: true });
