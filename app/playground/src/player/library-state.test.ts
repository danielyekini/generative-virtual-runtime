import { describe, expect, it } from "vitest";
import { decodeMeta, parseTags } from "./library-state";
import { decodeMine, encodeMine, filterLibrary, mineEntry } from "../library";

describe("Library persistence boundaries", () => {
  it("keeps uploaded importer formats across save and reload, and reads older native records", () => {
    const svg = { ...mineEntry("mine:svg", "Logo", "<svg/>"), format: "svg" as const };
    expect(decodeMine(encodeMine([svg]))[0]).toMatchObject({ format: "svg", source: "<svg/>" });
    const old = JSON.stringify({version:1, programs:[{key:"mine:old", label:"Old", source:"circle a {};"}]});
    expect(decodeMine(old)[0]?.format).toBe("motionscript");
    const unknown = JSON.stringify({version:1, programs:[{key:"mine:old", label:"Old", source:"", format:"exe"}]});
    expect(decodeMine(unknown)[0]?.format).toBe("motionscript");
  });
  it("searches every tag token with the same accent-insensitive rules as titles", () => {
    const entry = { ...mineEntry("mine:a", "Example", ""), tags: ["éducation", "physics"] };
    expect(filterLibrary([entry], { text:"education PHYS", collection:"My programs" })).toEqual([entry]);
  });
  it("tolerates corrupt metadata, validates fields and treats keys as data", () => {
    expect(Object.keys(decodeMeta("broken"))).toEqual([]);
    expect(Object.keys(decodeMeta("[]"))).toEqual([]);
    const meta = decodeMeta('{"__proto__":{"favourite":true},"mine:a":{"favourite":"yes","tags":["x",9,"x"],"openedAt":"bad","modifiedAt":42}}');
    expect(Object.getPrototypeOf(meta)).toBe(null);
    expect(meta["__proto__"]?.favourite).toBe(true);
    expect(meta["mine:a"]).toEqual({ favourite:false, tags:["x"], openedAt:0, modifiedAt:42 });
    expect(parseTags(" test, science, test, , ")).toEqual(["test", "science"]);
  });
});
