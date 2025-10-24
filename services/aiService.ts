import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { CollectedSong } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const generateRaidBossImage = async (bossName: string): Promise<string> => {
    try {
        const prompt = `A dramatic, epic, cinematic digital painting of a raid boss monster named '${bossName}'. It should look like a glitching, ethereal being made of television static and dark energy. Dark, moody lighting. Pixel art style.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: prompt }] },
          config: { responseModalities: [Modality.IMAGE] },
        });
        
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            return `data:image/png;base64,${base64ImageBytes}`;
          }
        }
        throw new Error("No image data in Gemini response.");

    } catch (error) {
        console.error("Error generating raid boss image with Gemini API:", error);
        return "https://i.imgur.com/r5s2hYf.png"; // Fallback: another monster image
    }
};


export const generateObscureStat = async (title: string, artist: string): Promise<string> => {
    try {
        const prompt = `Generate a short, fun, obscure, fictional statistic for the song "${title}" by ${artist}. Be creative, whimsical, and keep it under 15 words. For example: "The bassline is rumored to sync with planetary orbits." or "Was recorded in a single take during a meteor shower." Do not use quotes in your response.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const text = response.text.trim();
        
        if (!text) {
             throw new Error("Received an empty response from the AI.");
        }

        return text;

    } catch (error) {
        console.error("Error generating obscure stat with Gemini API:", error);
        // Provide a fallback stat in case of an API error
        return "Its frequency is known to attract cosmic dust.";
    }
};

export const generateEventDetails = async (theme: string): Promise<{ title: string, description: string }> => {
    try {
        const prompt = `Based on the theme "${theme}", generate a cool, music-themed event name and a two-sentence description for a week-long competition for Record Labels. The theme indicates how labels get points.
        - MYTHIC_MASTERS: collecting Mythic songs (100 pts) and achieving max artist mastery (50 pts).
        - SHINY_SHOWCASE: collecting Shiny songs.
        - VINYL_VANGUARDS: crafting Golden Vinyls.
        - TRADE_TITANS: completing trades with other users.
        - MASTERY_MARATHON: leveling up artist mastery.
        - RARITY_RUSH: collecting Rare or Mythic songs.
        - FRESH_FACES: collecting songs from artists new to the label.
        Return a JSON object with "title" and "description" keys.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                    },
                    required: ["title", "description"],
                },
            },
        });
        
        const jsonString = response.text.trim();
        if (!jsonString) {
             throw new Error("Received an empty JSON response from the AI.");
        }

        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Error generating event details with Gemini API:", error);
        return {
            title: `Weekly Challenge: ${theme}`,
            description: "A new weekly challenge has begun! Compete with other labels to prove your worth."
        };
    }
};

export const generateBattleReport = async (
    challengerName: string,
    opponentName: string,
    challengerDeck: CollectedSong[],
    opponentDeck: CollectedSong[],
    winnerName: string
): Promise<string> => {
    try {
        const formatSong = (cs: CollectedSong) => `"${cs.song.title}" (${cs.isPrestige ? 'Prestige ' : ''}${cs.song.isShiny ? 'Shiny ' : ''}${cs.song.rarity})`;
        const challengerSongs = challengerDeck.map(formatSong).join(', ');
        const opponentSongs = opponentDeck.map(formatSong).join(', ');

        const prompt = `You are a hype, energetic music battle commentator. Write a short, exciting battle report for a 'Song Battle'.
        - The challenger is ${challengerName}, who played: ${challengerSongs}.
        - The opponent is ${opponentName}, who played: ${opponentSongs}.
        - The winner was ${winnerName}.
        Keep the report to 2-3 sentences. Describe the battle with flair, maybe mentioning one key song matchup that turned the tide. Be creative and fun!`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const text = response.text.trim();
        if (!text) {
             throw new Error("Received an empty response from the AI for battle report.");
        }

        return text;
    } catch (error) {
        console.error("Error generating battle report with Gemini API:", error);
        return `${winnerName} emerged victorious after a legendary clash of titans! The sheer power of their collection was too much to handle.`;
    }
};