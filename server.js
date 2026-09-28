import { createServer } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const PORT = Number(process.env.PORT ?? 8787);
const MCP_PATH = "/mcp";

function createVeoServer() {
  const server = new McpServer(
    {
      name: "veo3-prompt-generator",
      version: "1.0.0"
    },
    {
      instructions: `
You are the VEO 3 Prompt Generator.

Your job is to help the user create extremely detailed cinematic prompts for Google VEO 3.

WORKFLOW:

POR TEXTO:
First collect the scene information through 20 guided questions in Portuguese.
Do not generate the final prompt before all required information has been collected.
After collecting the information, provide a short Portuguese summary of the planned video.
Then ask the user to choose:
1. Confirmado! Gere o Prompt!
2. Quero editar ou acrescentar algo.

Only generate the final prompt after the user confirms.

POR IMAGEM:
Ask the user to provide a reference image and a short Portuguese description of what should happen.
Analyze the visible composition, character, expression, lighting, texture, camera angle, environment and visual style.
Then provide a short Portuguese summary.
Ask the user to confirm or request changes.
Only generate the final prompt after confirmation.

FINAL PROMPT RULES:

- Maximum video duration: 8 seconds.
- Default aspect ratio: 16:9 horizontal.
- Prompt language: English.
- Character dialogue may remain in Portuguese.
- Never generate English subtitles.
- The final prompt must end with exactly: no subtitles
- The final prompt must be one single paragraph.
- The prompt must be highly cinematic, realistic and extremely detailed.
- Do not add technical footer information.
- Do not explain the prompt after generating it.

The prompt should describe:

A. Environment:
specific location, visual style, objects, materials, textures, spatial depth and composition.

B. Character:
age, ethnicity, gender, skin, hair, eyes, appearance, clothing, accessories, expression and posture.

C. Action:
exact action occurring within the maximum 8-second duration, timing, rhythm, natural gestures and transformations.

D. Camera:
shot type, framing, angle, lens behavior, focus, depth of field and camera movement.

E. Lighting:
light source, direction, color, reflections, projected shadows, contrast and atmosphere.

F. Color:
dominant colors, contrast, saturation and cinematic color grading.

G. Sound:
ambient sounds, environmental sounds, music, silence and synchronization with action.

H. Dialogue:
exact Portuguese dialogue when applicable, plus language, gender, approximate age, accent, emotional tone and delivery.

I. Visual style:
cinematic aesthetic, realism, animation or other requested style, lens effects, particles, fog, atmosphere and visual effects.

J. Texture and emotion:
surface textures, air movement, dust, vapor, humidity, weather and emotional tone.

K. Optional symbolism:
metaphors or symbolic visual elements when requested.

VERTICAL SOCIAL MEDIA MODE:

If the user requests TikTok, Reels, Shorts or another vertical destination, do not create ordinary portrait footage.

Instead include:

IMPORTANT: This video must be recorded with the camera physically rotated 90 degrees sideways (landscape mode, but positioned vertically/sideways). The subject, environment, and all visual elements must appear completely SIDEWAYS in the output as if the viewer needs to rotate the footage in post-production to see it correctly in a 9:16 vertical format. The entire composition must reflect this sideways perspective. Fixed viewing angle, as if running on the wall. Do NOT generate standard landscape or portrait orientation; the entire footage must appear visually rotated.

Also use concepts such as:
the environment appears sideways,
the character and all props are visibly rotated,
the floor runs vertically across the screen,
camera orientation simulates a sideways world,
fixed viewing angle, as if running on the wall.

Do not invent missing scene information.
If important information is missing, ask the user instead.
`
    }
  );

  server.registerTool(
    "create_veo3_prompt",
    {
      title: "Create VEO 3 Prompt",
      description:
        "Creates a single ultra-detailed cinematic Google VEO 3 prompt after the user has confirmed the scene summary.",
      inputSchema: {
        durationSeconds: z
          .number()
          .min(0.1)
          .max(8)
          .describe("Video duration in seconds. Maximum 8 seconds."),

        verticalSocialMedia: z
          .boolean()
          .describe(
            "True when the user wants TikTok, Reels, Shorts or another vertical destination."
          ),

        environment: z.string().min(1),
        character: z.string().min(1),
        appearance: z.string().min(1),
        clothing: z.string().min(1),
        expression: z.string().min(1),
        posture: z.string().min(1),

        action: z.string().min(1),
        rhythm: z.string().min(1),

        cameraFraming: z.string().min(1),
        cameraAngle: z.string().min(1),
        cameraMovement: z.string().min(1),

        lighting: z.string().min(1),
        shadows: z.string().min(1),

        colorPalette: z.string().min(1),

        ambientSound: z.string().min(1),
        music: z.string().min(1),

        dialogue: z
          .string()
          .optional()
          .describe("Exact Portuguese dialogue, if any."),

        voice: z
          .string()
          .optional()
          .describe(
            "Voice language, gender, approximate age, accent, emotional tone and delivery."
          ),

        visualStyle: z.string().min(1),
        effects: z.string().min(1),

        texture: z.string().min(1),
        atmosphere: z.string().min(1),
        emotion: z.string().min(1),

        symbolism: z
          .string()
          .optional()
          .describe("Optional symbolism or metaphor.")
      },

      outputSchema: {
        prompt: z.string(),
        durationSeconds: z.number(),
        aspectRatio: z.string(),
        verticalSimulation: z.boolean()
      }
    },

    async (input) => {
      const verticalInstruction = input.verticalSocialMedia
        ? `IMPORTANT: This video must be recorded with the camera physically rotated 90 degrees sideways (landscape mode, but positioned vertically/sideways). The subject, environment, and all visual elements must appear completely SIDEWAYS in the output as if the viewer needs to rotate the footage in post-production to see it correctly in a 9:16 vertical format. The entire composition must reflect this sideways perspective. Fixed viewing angle, as if running on the wall. Do NOT generate standard landscape or portrait orientation; the entire footage must appear visually rotated. The environment appears sideways, the character and all props are visibly rotated, the floor runs vertically across the screen, camera orientation simulates a sideways world, fixed viewing angle, as if running on the wall.`
        : "";

      const dialoguePart = input.dialogue
        ? `The character speaks exactly in Portuguese: "${input.dialogue}". Voice characteristics: ${input.voice || "natural Portuguese voice with an emotionally appropriate delivery"}.`
        : "There is no spoken dialogue.";

      const symbolismPart = input.symbolism
        ? `Symbolism or metaphor: ${input.symbolism}.`
        : "";

      const prompt = [
        verticalInstruction,

        `Create a highly cinematic, photorealistic ${input.durationSeconds}-second video scene set in ${input.environment}. The environment has carefully designed spatial depth, realistic materials, believable surface textures, and a clearly composed foreground, midground, and background.`,

        `The main character is ${input.character}. Their appearance is ${input.appearance}. They are wearing ${input.clothing}. Their facial expression is ${input.expression}, while their body posture and natural gestures are ${input.posture}.`,

        `The primary action is ${input.action}. The action unfolds ${input.rhythm}, with precise timing that fits naturally within the ${input.durationSeconds}-second duration, believable physical motion, subtle secondary movements, and a clear visual progression.`,

        `Camera framing: ${input.cameraFraming}. Camera angle: ${input.cameraAngle}. Camera movement: ${input.cameraMovement}. Use realistic lens behavior, natural depth of field, controlled focus, believable motion blur and cinematic spatial perspective.`,

        `Lighting: ${input.lighting}. Shadows: ${input.shadows}. The light produces physically believable highlights, reflections, contact shadows, falloff and dimensional separation.`,

        `Color palette: ${input.colorPalette}. Maintain consistent cinematic color grading, realistic skin tones and accurate material colors.`,

        `Ambient sound: ${input.ambientSound}. Music: ${input.music}. Sound should remain spatially consistent with the environment and synchronized naturally with the action.`,

        dialoguePart,

        `Visual style: ${input.visualStyle}. Visual effects: ${input.effects}. Surface and environmental texture: ${input.texture}. Atmospheric conditions: ${input.atmosphere}. Include believable air movement, particles, dust, vapor, fabric movement and environmental micro-details when appropriate.`,

        `The emotional tone is ${input.emotion}. The entire sequence should feel immersive, coherent, cinematic, physically plausible and intentionally directed, with natural motion, realistic anatomy, consistent character appearance and no abrupt visual discontinuities.`,

        symbolismPart,

        `The final image must maintain strong cinematic composition, visual clarity, realistic texture, controlled depth of field and coherent lighting throughout the entire short sequence. no subtitles`
      ]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      const result = {
        prompt,
        durationSeconds: input.durationSeconds,
        aspectRatio: "16:9",
        verticalSimulation: input.verticalSocialMedia
      };

      return {
        structuredContent: result,
        content: [
          {
            type: "text",
            text: prompt
          }
        ]
      };
    }
  );

  return server;
}

const httpServer = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400).end("Missing URL");
    return;
  }

  const url = new URL(
    req.url,
    `http://${req.headers.host ?? "localhost"}`
  );

  if (req.method === "OPTIONS" && url.pathname === MCP_PATH) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, mcp-session-id",
      "Access-Control-Expose-Headers": "Mcp-Session-Id"
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, {
      "content-type": "text/plain; charset=utf-8"
    });
    res.end("VEO 3 Prompt Generator MCP server is running.");
    return;
  }

  const MCP_METHODS = new Set(["POST", "GET", "DELETE"]);

  if (
    url.pathname === MCP_PATH &&
    req.method &&
    MCP_METHODS.has(req.method)
  ) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

    const server = createVeoServer();

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });

    res.on("close", () => {
      transport.close();
      server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("MCP request error:", error);

      if (!res.headersSent) {
        res.writeHead(500).end("Internal server error");
      }
    }

    return;
  }

  res.writeHead(404).end("Not Found");
});

httpServer.listen(PORT, () => {
  console.log(
    `VEO 3 Prompt Generator MCP server listening on http://localhost:${PORT}${MCP_PATH}`
  );
});
