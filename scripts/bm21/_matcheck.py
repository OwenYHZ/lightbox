import bpy
bpy.ops.wm.open_mainfile(filepath=r"E:/code/dshCode/Lightbox/scripts/bm21/bm21.blend")
for nm in ("BM21_front_logo", "BM21_top_print", "BM21_back_print"):
    m = bpy.data.materials.get(nm)
    print("==", nm, "blend_method=", getattr(m, "blend_method", "?"), "cutoff=", getattr(m, "alpha_cutoff", "?"))
    for n in m.node_tree.nodes:
        print("   node", n.type, n.name, getattr(getattr(n, "image", None), "name", ""),
              getattr(getattr(n, "image", None), "alpha_mode", ""),
              getattr(getattr(n, "image", None), "filepath", "")[-24:])
    for l in m.node_tree.links:
        print("   link", l.from_node.name, l.from_socket.name, "->", l.to_node.name, l.to_socket.name)
    b = m.node_tree.nodes["Principled BSDF"]
    print("   alpha default", b.inputs["Alpha"].default_value if not b.inputs["Alpha"].is_linked else "LINKED")
