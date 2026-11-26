import json, struct, sys
p = r"E:/code/dshCode/Lightbox/public/assets/models/konica-bm21.glb"
b = open(p, "rb").read()
magic, ver, length = struct.unpack("<III", b[:12])
off = 12
js = None
while off < length:
    ln, ty = struct.unpack("<II", b[off:off+8]); off += 8
    chunk = b[off:off+ln]; off += ln
    if ty == 0x4E4F534A:
        js = json.loads(chunk.decode("utf-8"))
print("bytes", len(b), "meshes", len(js.get("meshes", [])), "materials", len(js.get("materials", [])),
      "images", len(js.get("images", [])), "nodes", len(js.get("nodes", [])))
for m in js["materials"]:
    pbr = m.get("pbrMetallicRoughness", {})
    print("%-26s alphaMode=%-6s base=%s metal=%.2f rough=%.2f tex=%s normal=%s" % (
        m.get("name", "?"), m.get("alphaMode", "OPAQUE"),
        [round(x,3) for x in pbr.get("baseColorFactor", [1,1,1,1])],
        pbr.get("metallicFactor", 1.0), pbr.get("roughnessFactor", 1.0),
        "yes" if "baseColorTexture" in pbr else "no",
        "yes" if "normalTexture" in m else "no"))
print("alphaCutoff sample:", [m.get("alphaCutoff") for m in js["materials"] if m.get("alphaMode") == "MASK"][:3])
