#!/usr/bin/env python3
"""
Generate complete product models JSON with default_configurations
for all operable, glass, and accordion wall models.
"""
import json
import os

# Define panel finish categories (common for all operable models)
PANEL_FINISH_CATEGORIES = [
    "Koroseal Standard Vinyl", "Koroseal Upgrade Vinyl", "Shaw Standard Carpet",
    "HyTex Upgrade Carpet", "HyTex Standard Fabric", "HyTex Upgrade Fabric",
    "Standard Wood Veneer", "Wilsonart High Pressure Laminate (HPL)",
    "Full Height Marker (Tack) Board", "Uncovered", "C.O.M. Material",
    "Field Painting by Others"
]

# All operable wall models data
OPERABLE_MODELS = {
    # 2000 Series Individual Panels
    "2010": {"panel_config": "Individual Panels", "thickness": "3\"", "track_type": "Curve & Diverter (Individual) Track", "series": "2000",
             "panel_skins": ["Standard Acoustical Substrate", "Optional Steel Skin", "Optional Wood Veneer", "Optional High-Pressure Laminate"],
             "track_systems": ["Type 425 Clear Satin-Anodized Aluminum (Up to 525 lbs)", "Type 850 Clear Satin-Anodized Aluminum (>525–850 lbs)"],
             "vertical_seals": ["Trimless Astragal", "Cap-type Astragal"], "bottom_seals": ["Operable", "Adjustable", "Automatic"], "top_seals": ["Fixed"],
             "initial_closure": ["Bulb Seal", "Fixed Starter Jamb", "Adjustable Starter Jamb"],
             "final_closure": ["Hinged Panel(s)", "Portal Expander Panel", "Expander Panel", "Pocket Door(s)"], "stc_dynamic": True},

    "2010GL": {"panel_config": "Individual Panels", "thickness": "3\"", "track_type": "Curve & Diverter (Individual) Track", "series": "2000", "has_glass": True,
               "panel_skins": ["Standard Acoustical Substrate", "Optional Steel Skin"],
               "track_systems": ["Type 425 Clear Satin-Anodized Aluminum (Up to 525 lbs)", "Type 850 Clear Satin-Anodized Aluminum (>525–850 lbs)"],
               "vertical_seals": ["Trimless Astragal", "Cap-type Astragal"], "bottom_seals": ["Operable", "Adjustable", "Automatic"], "top_seals": ["Fixed"],
               "initial_closure": ["Bulb Seal", "Fixed Starter Jamb", "Adjustable Starter Jamb"],
               "final_closure": ["Hinged Panel(s)", "Portal Expander Panel", "Expander Panel", "Pocket Door(s)"], "stc_fixed": "38"},

    "2020": {"panel_config": "Individual Panels", "thickness": "3\"", "track_type": "Multi-Directional Track", "series": "2000",
             "panel_skins": ["Standard Acoustical Substrate", "Optional Steel Skin", "Optional Wood Veneer", "Optional High-Pressure Laminate"],
             "track_systems": ["Type 425 Clear Satin-Anodized Aluminum (Up to 525 lbs)", "Type 850 Clear Satin-Anodized Aluminum (>525–850 lbs)"],
             "vertical_seals": ["Trimless Astragal", "Cap-type Astragal"], "bottom_seals": ["Operable", "Adjustable", "Automatic"], "top_seals": ["Fixed", "Operable"],
             "initial_closure": ["Bulb Seal", "Fixed Starter Jamb", "Adjustable Starter Jamb"],
             "final_closure": ["Expander Panel", "Hinged Panel(s)", "Pocket Door(s)"], "stc_dynamic": True},

    "2020GL": {"panel_config": "Individual Panels", "thickness": "3\"", "track_type": "Multi-Directional Track", "series": "2000", "has_glass": True,
               "panel_skins": ["Standard Acoustical Substrate", "Optional Steel Skin"],
               "track_systems": ["Type 425 Clear Satin-Anodized Aluminum (Up to 525 lbs)", "Type 850 Clear Satin-Anodized Aluminum (>525–850 lbs)"],
               "vertical_seals": ["Trimless Astragal", "Cap-type Astragal"], "bottom_seals": ["Operable", "Adjustable", "Automatic"], "top_seals": ["Fixed", "Operable"],
               "initial_closure": ["Bulb Seal", "Fixed Starter Jamb", "Adjustable Starter Jamb"],
               "final_closure": ["Expander Panel", "Hinged Panel(s)", "Pocket Door(s)"], "stc_fixed": "38"},

    # 2000 Series Hinged-Paired
    "2030": {"panel_config": "Hinged-Paired Panels", "thickness": "3\"", "track_type": "Hinged-Pair (Straight Line) Track", "series": "2000",
             "panel_skins": ["Standard Acoustical Substrate", "Optional Steel Skin", "Optional Wood Veneer", "Optional High-Pressure Laminate"],
             "track_systems": ["Type 425 Clear Satin-Anodized Aluminum", "Type 850 Clear Satin-Anodized Aluminum", "Type 11L Black Painted Steel (Up to 900 lbs)"],
             "vertical_seals": ["Trimless Astragal", "Cap-type Astragal"], "bottom_seals": ["Operable", "Adjustable", "Automatic"], "top_seals": ["Fixed", "Operable"],
             "initial_closure": ["Bulb Seal", "Fixed Starter Jamb", "Adjustable Starter Jamb"],
             "final_closure": ["Expander Panel", "Hinged Panel(s)", "Communicating Panel", "Lap Panel", "Single Panel Expander", "Pocket Door(s)"], "stc_dynamic": True},

    "2030GL": {"panel_config": "Hinged-Paired Panels", "thickness": "3\"", "track_type": "Hinged-Pair (Straight Line) Track", "series": "2000", "has_glass": True,
               "panel_skins": ["Standard Acoustical Substrate", "Optional Steel Skin"],
               "track_systems": ["Type 425 Clear Satin-Anodized Aluminum", "Type 850 Clear Satin-Anodized Aluminum", "Type 11L Black Painted Steel (Up to 900 lbs)"],
               "vertical_seals": ["Trimless Astragal", "Cap-type Astragal"], "bottom_seals": ["Operable", "Adjustable", "Automatic"], "top_seals": ["Fixed", "Operable"],
               "initial_closure": ["Bulb Seal", "Fixed Starter Jamb", "Adjustable Starter Jamb"],
               "final_closure": ["Expander Panel", "Hinged Panel(s)", "Communicating Panel", "Lap Panel", "Single Panel Expander", "Pocket Door(s)"], "stc_fixed": "38"},

    # 2000 Series Continuously-Hinged
    "2050e": {"panel_config": "Continuously-Hinged Panels", "thickness": "3\"", "track_type": "Hinged-Pair (Straight Line) Track", "series": "2000", "is_electric": True,
              "panel_skins": ["Standard Acoustical Substrate", "Optional Steel Skin"],
              "track_systems": ["Type H.D. Electric Steel"],
              "vertical_seals": ["Trimless Astragal", "Cap-type Astragal"], "bottom_seals": ["Adjustable"], "top_seals": ["Fixed", "Operable"],
              "initial_closure": ["Adjustable-Compensating"],
              "final_closure": ["Manual Half Panel"], "stc_dynamic": True},

    # 3000 Series Individual Panels
    "3010": {"panel_config": "Individual Panels", "thickness": "4\"", "track_type": "Curve & Diverter (Individual) Track", "series": "3000",
             "panel_skins": ["Standard Steel Skin", "Optional Acoustical Substrate", "Optional Wood Veneer", "Optional High-Pressure Laminate"],
             "track_systems": ["Type 425 Clear Satin-Anodized Aluminum (Up to 525 lbs)", "Type 850 Clear Satin-Anodized Aluminum (>525–850 lbs)"],
             "vertical_seals": ["Trimless Astragal", "Cap-type Astragal"], "bottom_seals": ["Operable", "Adjustable", "Automatic"], "top_seals": ["Fixed"],
             "initial_closure": ["Bulb Seal", "Fixed Starter Jamb", "Adjustable Starter Jamb"],
             "final_closure": ["Hinged Panel(s)", "Portal Expander Panel", "Pocket Door(s)"], "stc_dynamic": True},

    "3010GL": {"panel_config": "Individual Panels", "thickness": "4\"", "track_type": "Curve & Diverter (Individual) Track", "series": "3000", "has_glass": True,
               "panel_skins": ["Standard Steel Skin", "Optional Acoustical Substrate"],
               "track_systems": ["Type 425 Clear Satin-Anodized Aluminum (Up to 525 lbs)", "Type 850 Clear Satin-Anodized Aluminum (>525–850 lbs)"],
               "vertical_seals": ["Trimless Astragal", "Cap-type Astragal"], "bottom_seals": ["Operable", "Adjustable", "Automatic"], "top_seals": ["Fixed"],
               "initial_closure": ["Bulb Seal", "Fixed Starter Jamb", "Adjustable Starter Jamb"],
               "final_closure": ["Hinged Panel(s)", "Portal Expander Panel", "Pocket Door(s)"], "stc_fixed": "38"},

    "3020": {"panel_config": "Individual Panels", "thickness": "4\"", "track_type": "Multi-Directional Track", "series": "3000",
             "panel_skins": ["Standard Steel Skin", "Optional Acoustical Substrate", "Optional Wood Veneer", "Optional High-Pressure Laminate"],
             "track_systems": ["Type 425 Clear Satin-Anodized Aluminum (Up to 525 lbs)", "Type 850 Clear Satin-Anodized Aluminum (>525–850 lbs)"],
             "vertical_seals": ["Trimless Astragal", "Cap-type Astragal"], "bottom_seals": ["Operable", "Adjustable", "Automatic"], "top_seals": ["Fixed", "Operable"],
             "initial_closure": ["Bulb Seal", "Fixed Starter Jamb", "Adjustable Starter Jamb"],
             "final_closure": ["Expander Panel", "Hinged Panel(s)", "Pocket Door(s)"], "stc_dynamic": True},

    "3020GL": {"panel_config": "Individual Panels", "thickness": "4\"", "track_type": "Multi-Directional Track", "series": "3000", "has_glass": True,
               "panel_skins": ["Standard Steel Skin", "Optional Acoustical Substrate"],
               "track_systems": ["Type 425 Clear Satin-Anodized Aluminum (Up to 525 lbs)", "Type 850 Clear Satin-Anodized Aluminum (>525–850 lbs)"],
               "vertical_seals": ["Trimless Astragal", "Cap-type Astragal"], "bottom_seals": ["Operable", "Adjustable", "Automatic"], "top_seals": ["Fixed", "Operable"],
               "initial_closure": ["Bulb Seal", "Fixed Starter Jamb", "Adjustable Starter Jamb"],
               "final_closure": ["Expander Panel", "Hinged Panel(s)", "Pocket Door(s)"], "stc_fixed": "38"},

    # 3000 Series Hinged-Paired
    "3030": {"panel_config": "Hinged-Paired Panels", "thickness": "4\"", "track_type": "Hinged-Pair (Straight Line) Track", "series": "3000",
             "panel_skins": ["Standard Steel Skin", "Optional Acoustical Substrate", "Optional Wood Veneer", "Optional High-Pressure Laminate"],
             "track_systems": ["Type 425 Clear Satin-Anodized Aluminum", "Type 850 Clear Satin-Anodized Aluminum", "Type 11L Black Painted Steel (Up to 900 lbs)"],
             "vertical_seals": ["Trimless Astragal", "Cap-type Astragal"], "bottom_seals": ["Operable", "Adjustable", "Automatic"], "top_seals": ["Fixed", "Operable"],
             "initial_closure": ["Bulb Seal", "Fixed Starter Jamb", "Adjustable Starter Jamb"],
             "final_closure": ["Expander Panel", "Hinged Panel(s)", "Communicating Panel", "Three-Panel-Train", "Lap Panel", "Single Panel Expander", "Pocket Door(s)"], "stc_dynamic": True},

    "3030GL": {"panel_config": "Hinged-Paired Panels", "thickness": "4\"", "track_type": "Hinged-Pair (Straight Line) Track", "series": "3000", "has_glass": True,
               "panel_skins": ["Standard Steel Skin", "Optional Acoustical Substrate"],
               "track_systems": ["Type 425 Clear Satin-Anodized Aluminum", "Type 850 Clear Satin-Anodized Aluminum", "Type 11L Black Painted Steel (Up to 900 lbs)"],
               "vertical_seals": ["Trimless Astragal", "Cap-type Astragal"], "bottom_seals": ["Operable", "Adjustable", "Automatic"], "top_seals": ["Fixed", "Operable"],
               "initial_closure": ["Bulb Seal", "Fixed Starter Jamb", "Adjustable Starter Jamb"],
               "final_closure": ["Expander Panel", "Hinged Panel(s)", "Communicating Panel", "Three-Panel-Train", "Lap Panel", "Single Panel Expander", "Pocket Door(s)"], "stc_fixed": "38"},

    # 3000 Series Continuously-Hinged
    "3050e": {"panel_config": "Continuously-Hinged Panels", "thickness": "4\"", "track_type": "Hinged-Pair (Straight Line) Track", "series": "3000", "is_electric": True,
              "panel_skins": ["Standard Steel Skin", "Optional Acoustical Substrate"],
              "track_systems": ["Type H.D. Electric Steel"],
              "vertical_seals": ["Trimless Astragal", "Cap-type Astragal"], "bottom_seals": ["Adjustable"], "top_seals": ["Fixed", "Operable"],
              "initial_closure": ["Fixed Ball Seal", "Adjustable-Compensating"],
              "final_closure": ["L-Jamb", "Manual Half Panel Pivot", "Automatic Half Panel Pivot"], "stc_dynamic": True},

    # Hufcor Models
    "Hufcor 641": {"panel_config": "Individual Panels", "thickness": "4\"", "track_type": "Omni-Directional (Individual) Track", "series": "600",
                   "panel_skins": ["Steel"],
                   "track_systems": ["Type 26 Clear Satin-Anodized Aluminum", "Type 36 Clear Satin-Anodized Aluminum", "Type 57 Clear Anodized Aluminum", "Type 11L Clear Satin-Anodized Steel", "Type 11 Clear Satin-Anodized Steel"],
                   "vertical_seals": ["Unspecified"], "bottom_seals": ["Retractable (2\")", "Retractable (4\")", "Fixed"], "top_seals": ["Retractable", "Fixed"],
                   "initial_closure": ["Bulb Seal", "Adjustable Starter Jamb"],
                   "final_closure": ["Expanding Jamb (Lever) Panel"], "stc_fixed_multi": ["43", "47", "49", "52", "54", "56"]},

    "Hufcor 642": {"panel_config": "Hinged-Paired Panels", "thickness": "4\"", "track_type": "Hinged-Pair (Straight Line) Track", "series": "600",
                   "panel_skins": ["Steel"],
                   "track_systems": ["Type 38 Clear Satin-Anodized Aluminum", "Type 11 Clear Satin-Anodized Steel"],
                   "vertical_seals": ["Unspecified"], "bottom_seals": ["Retractable", "Fixed"], "top_seals": ["Retractable", "Fixed"],
                   "initial_closure": ["Bulb Seal", "Adjustable Starter Jamb"],
                   "final_closure": ["Expanding Jamb (Lever) Panel"], "stc_fixed_multi": ["43", "47", "49", "52", "54", "56"]},
}

# Glass wall models
GLASS_MODELS = {
    "Stella": {
        "configurations": ["Individual, Multi-Directional Panels", "Individual, Single Carrier Panels", "Individual, Fully Automatic Panels"],
        "panel_operations": ["Manual", "Fully Automatic", "Semi-Automated Seals"],
        "glass_types": ["Tempered Glass", "Laminated Glass", "Switchable Glass", "Child-Safe Glass", "Fully Back-Painted Glass"],
        "stc_ratings": ["44", "50"],
        "partition_support": ["Top-Supported"],
        "pass_door_types": ["Full-Height", "Inset"],
        "pass_door_options": ["Single", "Double"],
        "panel_faces": ["Solid Face", "MDF-Backed Melamine", "High Pressure Laminate", "Electrical Internal Mini-Blinds", "Internal Mullions & Muntins"],
        "hinging": ["Invisible Hinges"],
        "frame_finishes": ["Clear Anodized", "Black", "White", "Custom RAL Powder Coat", "Sublimation Wood Look"],
        "track_system": "Architectural Grade Extruded Aluminum Alloy 6063-T6",
        "track_types": ["Top-Supported Multi-directional & Single-Point"],
        "track_finishes": ["Clear Anodized", "Black Powder Coat", "White Powder Coat", "Custom RAL Option"],
        "floor_guide": "Not Required",
        "final_closures": ["Panel-Mounted Telescoping Jamb", "Wall-Mounted Telescoping Jamb", "Full-Height Door"],
        "bottom_seals": ["Electric", "Automatic", "Semi-Automatic", "Manual", "Operable"],
        "top_seals": ["Electric", "Automatic", "Semi-Automatic", "Manual", "Operable"],
        "frame_thickness_dynamic": True
    },
    "Luna": {
        "configurations": ["Individual, Multi-Directional Panels", "Continuously-Hinged Panels"],
        "panel_operations": ["Manual"],
        "glass_types": ["Tempered Glass", "Laminated Glass", "Switchable Glass", "Child-Safe Glass", "Fully Back-Painted Glass"],
        "stc_ratings": ["43"],
        "partition_support": ["Top-Supported", "Floor-Supported"],
        "pass_door_types": ["Full-Height"],
        "pass_door_options": ["Single", "Double"],
        "panel_faces": ["Solid Face", "MDF-Backed Melamine", "High Pressure Laminate", "Electrical Internal Mini-Blinds", "Internal Muntins"],
        "hinging": ["Invisible Hinges"],
        "frame_finishes": ["Black Powder Coat", "Custom RAL Powder Coat", "Sublimation Wood Look"],
        "track_system": "Architectural Grade Extruded Aluminum Alloy 6063-T6",
        "track_types": ["Top-Supported Multi-directional & Single-Point", "Floor-Supported Top Guide"],
        "track_finishes": ["Black Powder Coat", "Clear Anodized", "White", "Custom RAL Option"],
        "floor_guide": "Optional",
        "final_closures": ["Hinged Closure Panel", "Full-Height Door"],
        "bottom_seals": ["Floor Supported Fixed Bulb", "Top Supported Fixed Brush"],
        "top_seals": ["Floor Supported Fixed Bulb", "Top Supported Fixed Brush"],
        "frame_thickness": "2 3/4\""
    },
    "Illona": {
        "configurations": ["Individual, Multi-Directional Panels", "Continuously-Hinged Panels", "Pivoting Individual Panels", "Single & Telescoping Slider Panels"],
        "panel_operations": ["Manual"],
        "glass_types": ["Tempered Glass", "Laminated Glass", "Back-Painted Glass"],
        "stc_ratings": ["33"],
        "partition_support": ["Top-Supported"],
        "pass_door_types": ["Full-Height"],
        "pass_door_options": ["Single", "Double"],
        "panel_faces": ["Surface-Mounted Muntins"],
        "hinging": ["Invisible Hinges"],
        "frame_finishes": ["Black Powder Coat", "White Powder Coat", "Custom RAL Powder Coat", "Sublimation Wood Look"],
        "track_system": "Architectural Grade Extruded Aluminum Alloy 6063-T6",
        "track_types": ["Top-Supported Multi-directional & Single-Point"],
        "track_finishes": ["Black Powder Coat", "Clear Anodized", "White Powder Coat", "Custom RAL Option"],
        "floor_guide": "Optional",
        "final_closures": ["Hinged Closure Panel", "Full-Height Door"],
        "bottom_seals": ["Fixed Brush"],
        "top_seals": ["Fixed Brush"],
        "frame_thickness": "1 3/8\""
    },
    "Ava": {
        "configurations": ["Individual, Multi-Directional Panels", "Hinged-Paired Panels"],
        "panel_operations": ["Manual"],
        "glass_types": ["1/2\" Tempered Glass"],
        "stc_ratings": ["Non-Acoustic"],
        "partition_support": ["Top-Supported"],
        "pass_door_types": ["Full-Height"],
        "pass_door_options": ["Single", "Double"],
        "panel_faces": ["Not Required"],
        "hinging": ["Optional Full-Leaf Butt Hinges"],
        "frame_finishes": ["Clear Anodized", "Black Powder Coat", "Custom RAL Color Options"],
        "track_system": "Architectural Grade Extruded Aluminum Alloy 6063-T6",
        "track_types": ["Top-Supported Multi-directional & Single-Point"],
        "track_finishes": ["Black Powder Coat", "Clear Anodized", "Custom RAL Color Option"],
        "floor_guide": "Not Required",
        "final_closures": ["Fixed Pivot Panel", "Fixed Swing Panel"],
        "bottom_seals": ["Fixed Brush"],
        "top_seals": ["Fixed Brush"],
        "frame_thickness": "1 7/16\""
    },
    "Mata": {
        "configurations": ["Individual, Multi-Directional Panels", "Continuously-Hinged Panels", "Single & Telescoping Slider Panels"],
        "panel_operations": ["Manual"],
        "glass_types": ["1/4\" Tempered Glass", "5/16\" Frosted Laminated Glass", "Custom Glass Options"],
        "stc_ratings": ["Non-Acoustic"],
        "partition_support": ["Top-Supported"],
        "pass_door_types": ["Full-Height"],
        "pass_door_options": ["Single", "Double"],
        "panel_faces": ["Wood Insert", "Mullions & Surface-Mounted Muntins"],
        "hinging": ["Optional Full-Leaf Butt Hinges"],
        "frame_finishes": ["Stained Fruitwood Dark Oak", "Stained Wheat", "Stained Cordovan", "Painted Black", "Painted White", "Unfinished"],
        "track_system": "Architectural Grade Extruded Aluminum Alloy 6063-T6",
        "track_types": ["Top-Supported Multi-directional & Single-Point"],
        "track_finishes": ["Black Powder Coat", "Clear Anodized", "Custom RAL Option"],
        "floor_guide": "Not Required",
        "final_closures": ["Hinged Closure Panel"],
        "bottom_seals": ["Fixed Flexible Vinyl"],
        "top_seals": ["Fixed Flexible Vinyl"],
        "frame_thickness": "1 3/4\""
    }
}

# Accordion models
ACCORDION_MODELS = {
    "VL-2": {
        "series": "VL",
        "stc_rating": "35",
        "max_height": "16'-0\"",
        "max_width": "25'-0\"",
        "panel_faces": ["Reinforced vinyl fabric with woven backing", "Carpet of non-woven, 100% polyester staple fiber with fusible latex backing", "Customer supplied materials (subject to factory approval)"],
        "track_system": "Curtition #4 Architectural Grade Aluminum Extrusion",
        "track_system_option": "Ceiling Guard",
        "track_mounting": ["Surface-Mounted", "Concealed"],
        "top_seals": ["1/2\" multi-ply rubberized sweep strip"],
        "bottom_seals": ["1-1/2\" multi-ply rubberized sweep strip", "3\" multi-ply rubberized sweep strip"],
        "options": ["Lock on one or both sides", "Radius construction for curved applications", "Track switches for alternate storage or multi-location applications", "Floating posts for latching of multiple partitions in L, T, and X configurations", "Storage pocket with sliding jamb", "Storage pocket with door", "Conversion latch"],
        "final_closures": ["Latch Mechanism", "Tiebacks", "Pocket Door(s)"]
    },
    "VL-6": {
        "series": "VL",
        "stc_rating": "38",
        "max_height": "16'-0\"",
        "max_width": "25'-0\"",
        "panel_faces": ["Reinforced vinyl fabric with woven backing", "Carpet of non-woven, 100% polyester staple fiber with fusible latex backing", "Customer supplied materials (subject to factory approval)"],
        "track_system": "Curtition #4 Architectural Grade Aluminum Extrusion",
        "track_system_option": "Ceiling Guard",
        "track_mounting": ["Surface-Mounted", "Concealed"],
        "top_seals": ["1/2\" multi-ply rubberized sweep strip"],
        "bottom_seals": ["1-1/2\" multi-ply rubberized sweep strip", "3\" multi-ply rubberized sweep strip"],
        "options": ["Lock on one or both sides", "Radius construction for curved applications", "Track switches for alternate storage or multi-location applications", "Floating posts for latching of multiple partitions in L, T, and X configurations", "Storage pocket with sliding jamb", "Storage pocket with door", "Conversion latch"],
        "final_closures": ["Latch Mechanism", "Tiebacks", "Pocket Door(s)"]
    },
    "VL-8": {
        "series": "VL",
        "stc_rating": "40",
        "max_height": "16'-0\"",
        "max_width": "25'-0\"",
        "panel_faces": ["Reinforced vinyl fabric with woven backing", "Carpet of non-woven, 100% polyester staple fiber with fusible latex backing", "Customer supplied materials (subject to factory approval)"],
        "track_system": "Curtition #4 Architectural Grade Aluminum Extrusion",
        "track_system_option": "Ceiling Guard",
        "track_mounting": ["Surface-Mounted", "Concealed"],
        "top_seals": ["1/2\" multi-ply rubberized sweep strip"],
        "bottom_seals": ["1-1/2\" multi-ply rubberized sweep strip", "3\" multi-ply rubberized sweep strip"],
        "options": ["Lock on one or both sides", "Radius construction for curved applications", "Track switches for alternate storage or multi-location applications", "Floating posts for latching of multiple partitions in L, T, and X configurations", "Storage pocket with sliding jamb", "Storage pocket with door", "Conversion latch"],
        "final_closures": ["Latch Mechanism", "Tiebacks", "Pocket Door(s)"]
    },
    "MK-X": {
        "series": "MK",
        "stc_rating": "Non-Acoustic",
        "max_height": "16'-0\"",
        "max_width": "16'-0\"",
        "panel_faces": ["Reinforced vinyl fabric with woven backing", "Carpet of non-woven, 100% polyester staple fiber with fusible latex backing"],
        "track_system": "Curtition #4 Architectural Grade Aluminum Extrusion",
        "track_system_option": "Ceiling Guard",
        "track_mounting": ["Surface-Mounted", "Concealed"],
        "top_seals": [],
        "bottom_seals": [],
        "options": ["Lock on one or both sides", "Radius construction for curved applications", "Track switches for alternate storage or multi-location applications", "Floating posts for latching of multiple partitions in L, T, and X configurations", "Storage pocket with sliding jamb", "Storage pocket with door"],
        "final_closures": ["Latch Mechanism", "Tiebacks", "Pocket Door(s)"]
    },
    "MK-XX": {
        "series": "MK",
        "stc_rating": "Non-Acoustic",
        "max_height": "16'-0\"",
        "max_width": "25'-0\"",
        "panel_faces": ["Reinforced vinyl fabric with woven backing", "Carpet of non-woven, 100% polyester staple fiber with fusible latex backing"],
        "track_system": "Curtition #4 Architectural Grade Aluminum Extrusion",
        "track_system_option": "Ceiling Guard",
        "track_mounting": ["Surface-Mounted", "Concealed"],
        "top_seals": [],
        "bottom_seals": [],
        "options": ["Lock on one or both sides", "Radius construction for curved applications", "Track switches for alternate storage or multi-location applications", "Floating posts for latching of multiple partitions in L, T, and X configurations", "Storage pocket with sliding jamb", "Storage pocket with door"],
        "final_closures": ["Latch Mechanism", "Tiebacks", "Pocket Door(s)"]
    }
}


def create_operable_config(model_name, model_data):
    """Create default_configurations for operable wall model"""
    config = {
        "Panel Configuration": {
            "value": model_data["panel_config"],
            "manual_select": False,
            "options": None,
            "placeholder": None,
            "required": True,
            "depends_on": None
        },
        "Panel Thickness": {
            "value": model_data["thickness"],
            "manual_select": False,
            "options": None,
            "placeholder": None,
            "required": True,
            "depends_on": None
        },
        "Track Type": {
            "value": model_data["track_type"],
            "manual_select": False,
            "options": None,
            "placeholder": None,
            "required": True,
            "depends_on": None
        }
    }

    if model_data.get("has_glass"):
        config["Has Glass Lights"] = {
            "value": True,
            "manual_select": False,
            "options": None,
            "placeholder": None,
            "required": True,
            "depends_on": None
        }

    if model_data.get("is_electric"):
        config["Operating Method"] = {
            "value": "Electric",
            "manual_select": False,
            "options": None,
            "placeholder": None,
            "required": True,
            "depends_on": None
        }

    config["Panel Skin"] = {
        "value": None,
        "manual_select": True,
        "options": model_data["panel_skins"],
        "placeholder": "Select panel skin",
        "required": True,
        "depends_on": None
    }

    if model_data.get("stc_fixed"):
        config["STC Rating"] = {
            "value": model_data["stc_fixed"],
            "manual_select": False,
            "options": [model_data["stc_fixed"]],
            "placeholder": None,
            "required": True,
            "depends_on": None
        }
    elif model_data.get("stc_fixed_multi"):
        config["STC Rating"] = {
            "value": None,
            "manual_select": True,
            "options": model_data["stc_fixed_multi"],
            "placeholder": "Select STC rating",
            "required": True,
            "depends_on": None
        }
    elif model_data.get("stc_dynamic"):
        config["STC Rating"] = {
            "value": None,
            "manual_select": True,
            "options": [],
            "placeholder": "Select STC rating",
            "required": True,
            "depends_on": "Panel Skin"
        }

    config.update({
        "Track System": {
            "value": None if len(model_data["track_systems"]) > 1 else model_data["track_systems"][0],
            "manual_select": len(model_data["track_systems"]) > 1,
            "options": model_data["track_systems"],
            "placeholder": "Select track system" if len(model_data["track_systems"]) > 1 else None,
            "required": True,
            "depends_on": None
        },
        "Pass Door Panels": {
            "value": None,
            "manual_select": True,
            "options": ["Single", "Double"],
            "placeholder": "Select pass door type",
            "required": False,
            "depends_on": None
        },
        "Pass Door Quantity": {
            "value": None,
            "manual_select": True,
            "options": ["1", "2", "3"],
            "placeholder": "Select quantity",
            "required": False,
            "depends_on": "Pass Door Panels"
        },
        "Panel Finish Category": {
            "value": None,
            "manual_select": True,
            "options": PANEL_FINISH_CATEGORIES,
            "placeholder": "Select panel finish category",
            "required": True,
            "depends_on": None
        },
        "Panel Finish Specific Item": {
            "value": None,
            "manual_select": True,
            "options": [],
            "placeholder": "Select specific finish",
            "required": False,
            "depends_on": "Panel Finish Category"
        }
    })

    # Vertical seals
    if len(model_data["vertical_seals"]) == 1:
        config["Vertical Seals"] = {
            "value": model_data["vertical_seals"][0],
            "manual_select": False,
            "options": model_data["vertical_seals"],
            "placeholder": None,
            "required": True,
            "depends_on": None
        }
    else:
        config["Vertical Seals"] = {
            "value": None,
            "manual_select": True,
            "options": model_data["vertical_seals"],
            "placeholder": "Select vertical seal",
            "required": True,
            "depends_on": None
        }

    # Bottom seals
    if len(model_data["bottom_seals"]) == 1:
        config["Bottom Seals"] = {
            "value": model_data["bottom_seals"][0],
            "manual_select": False,
            "options": model_data["bottom_seals"],
            "placeholder": None,
            "required": True,
            "depends_on": None
        }
    else:
        config["Bottom Seals"] = {
            "value": None,
            "manual_select": True,
            "options": model_data["bottom_seals"],
            "placeholder": "Select bottom seal",
            "required": True,
            "depends_on": None
        }

    # Top seals
    if len(model_data["top_seals"]) == 1:
        config["Top Seals"] = {
            "value": model_data["top_seals"][0],
            "manual_select": False,
            "options": model_data["top_seals"],
            "placeholder": None,
            "required": True,
            "depends_on": None
        }
    else:
        config["Top Seals"] = {
            "value": None,
            "manual_select": True,
            "options": model_data["top_seals"],
            "placeholder": "Select top seal",
            "required": True,
            "depends_on": None
        }

    # Initial closure
    if len(model_data["initial_closure"]) == 1:
        config["Initial Closure System"] = {
            "value": model_data["initial_closure"][0],
            "manual_select": False,
            "options": model_data["initial_closure"],
            "placeholder": None,
            "required": True,
            "depends_on": None
        }
    else:
        config["Initial Closure System"] = {
            "value": None,
            "manual_select": True,
            "options": model_data["initial_closure"],
            "placeholder": "Select initial closure",
            "required": True,
            "depends_on": None
        }

    # Final closure
    if len(model_data["final_closure"]) == 1:
        config["Final Closure System"] = {
            "value": model_data["final_closure"][0],
            "manual_select": False,
            "options": model_data["final_closure"],
            "placeholder": None,
            "required": True,
            "depends_on": None
        }
    else:
        config["Final Closure System"] = {
            "value": None,
            "manual_select": True,
            "options": model_data["final_closure"],
            "placeholder": "Select final closure",
            "required": True,
            "depends_on": None
        }

    return config


def create_glass_config(model_name, model_data):
    """Create default_configurations for glass wall model"""
    config = {
        "Panel Configuration": {
            "value": None,
            "manual_select": True,
            "options": model_data["configurations"],
            "placeholder": "Select panel configuration",
            "required": True,
            "depends_on": None
        },
        "Panel Operation": {
            "value": None,
            "manual_select": True,
            "options": model_data["panel_operations"],
            "placeholder": "Select panel operation",
            "required": True,
            "depends_on": "Panel Configuration" if model_name == "Stella" else None
        },
        "Glass Type": {
            "value": None if len(model_data["glass_types"]) > 1 else model_data["glass_types"][0],
            "manual_select": len(model_data["glass_types"]) > 1,
            "options": model_data["glass_types"],
            "placeholder": "Select glass type" if len(model_data["glass_types"]) > 1 else None,
            "required": True,
            "depends_on": None
        }
    }

    # STC Rating
    if len(model_data["stc_ratings"]) == 1:
        config["STC Rating"] = {
            "value": model_data["stc_ratings"][0],
            "manual_select": False,
            "options": model_data["stc_ratings"],
            "placeholder": None,
            "required": True,
            "depends_on": None
        }
    else:
        config["STC Rating"] = {
            "value": None,
            "manual_select": True,
            "options": model_data["stc_ratings"],
            "placeholder": "Select STC rating",
            "required": True,
            "depends_on": None
        }

    # Frame Thickness
    if model_data.get("frame_thickness_dynamic"):
        config["Frame Thickness"] = {
            "value": None,
            "manual_select": False,
            "options": None,
            "placeholder": None,
            "required": True,
            "depends_on": "STC Rating"
        }
    elif model_data.get("frame_thickness"):
        config["Frame Thickness"] = {
            "value": model_data["frame_thickness"],
            "manual_select": False,
            "options": None,
            "placeholder": None,
            "required": True,
            "depends_on": None
        }

    config.update({
        "Partition Support": {
            "value": None if len(model_data["partition_support"]) > 1 else model_data["partition_support"][0],
            "manual_select": len(model_data["partition_support"]) > 1,
            "options": model_data["partition_support"],
            "placeholder": "Select partition support" if len(model_data["partition_support"]) > 1 else None,
            "required": True,
            "depends_on": None
        },
        "Pass Door Type": {
            "value": None if len(model_data["pass_door_types"]) > 1 else model_data["pass_door_types"][0],
            "manual_select": len(model_data["pass_door_types"]) > 1,
            "options": model_data["pass_door_types"],
            "placeholder": "Select pass door type" if len(model_data["pass_door_types"]) > 1 else None,
            "required": False,
            "depends_on": None
        },
        "Pass Door Option": {
            "value": None,
            "manual_select": True,
            "options": model_data["pass_door_options"],
            "placeholder": "Select pass door option",
            "required": False,
            "depends_on": "Pass Door Type"
        },
        "Panel Face": {
            "value": None if len(model_data["panel_faces"]) > 1 else model_data["panel_faces"][0],
            "manual_select": len(model_data["panel_faces"]) > 1,
            "options": model_data["panel_faces"],
            "placeholder": "Select panel face" if len(model_data["panel_faces"]) > 1 else None,
            "required": True,
            "depends_on": None
        },
        "Hinging": {
            "value": model_data["hinging"][0],
            "manual_select": False,
            "options": model_data["hinging"],
            "placeholder": None,
            "required": True,
            "depends_on": None
        },
        "Frame Finish": {
            "value": None,
            "manual_select": True,
            "options": model_data["frame_finishes"],
            "placeholder": "Select frame finish",
            "required": True,
            "depends_on": None
        },
        "Track System": {
            "value": model_data["track_system"],
            "manual_select": False,
            "options": None,
            "placeholder": None,
            "required": True,
            "depends_on": None
        },
        "Track Type": {
            "value": None if len(model_data["track_types"]) > 1 else model_data["track_types"][0],
            "manual_select": len(model_data["track_types"]) > 1,
            "options": model_data["track_types"],
            "placeholder": "Select track type" if len(model_data["track_types"]) > 1 else None,
            "required": True,
            "depends_on": None
        },
        "Track Finish": {
            "value": None,
            "manual_select": True,
            "options": model_data["track_finishes"],
            "placeholder": "Select track finish",
            "required": True,
            "depends_on": None
        },
        "Floor Guide": {
            "value": model_data["floor_guide"],
            "manual_select": False,
            "options": None,
            "placeholder": None,
            "required": True,
            "depends_on": None
        },
        "Final Closure": {
            "value": None if len(model_data["final_closures"]) > 1 else model_data["final_closures"][0],
            "manual_select": len(model_data["final_closures"]) > 1,
            "options": model_data["final_closures"],
            "placeholder": "Select final closure" if len(model_data["final_closures"]) > 1 else None,
            "required": True,
            "depends_on": None
        }
    })

    # Bottom seals
    if len(model_data["bottom_seals"]) == 1:
        config["Bottom Seals"] = {
            "value": model_data["bottom_seals"][0],
            "manual_select": False,
            "options": model_data["bottom_seals"],
            "placeholder": None,
            "required": True,
            "depends_on": None
        }
    else:
        config["Bottom Seals"] = {
            "value": None,
            "manual_select": True,
            "options": model_data["bottom_seals"],
            "placeholder": "Select bottom seal",
            "required": True,
            "depends_on": None
        }

    # Top seals
    if len(model_data["top_seals"]) == 1:
        config["Top Seals"] = {
            "value": model_data["top_seals"][0],
            "manual_select": False,
            "options": model_data["top_seals"],
            "placeholder": None,
            "required": True,
            "depends_on": None
        }
    else:
        config["Top Seals"] = {
            "value": None,
            "manual_select": True,
            "options": model_data["top_seals"],
            "placeholder": "Select top seal",
            "required": True,
            "depends_on": None
        }

    return config


def create_accordion_config(model_name, model_data):
    """Create default_configurations for accordion model"""
    config = {
        "Max Partition Height": {
            "value": model_data["max_height"],
            "manual_select": False,
            "options": None,
            "placeholder": None,
            "required": True,
            "depends_on": None
        },
        "Max Wall Width": {
            "value": model_data["max_width"],
            "manual_select": False,
            "options": None,
            "placeholder": None,
            "required": True,
            "depends_on": None
        },
        "STC Rating": {
            "value": model_data["stc_rating"],
            "manual_select": False,
            "options": [model_data["stc_rating"]],
            "placeholder": None,
            "required": True,
            "depends_on": None
        },
        "Panel Face": {
            "value": None,
            "manual_select": True,
            "options": model_data["panel_faces"],
            "placeholder": "Select panel face",
            "required": True,
            "depends_on": None
        },
        "Track System": {
            "value": model_data["track_system"],
            "manual_select": False,
            "options": None,
            "placeholder": None,
            "required": True,
            "depends_on": None
        },
        "Track System Option": {
            "value": model_data["track_system_option"],
            "manual_select": False,
            "options": None,
            "placeholder": None,
            "required": True,
            "depends_on": None
        },
        "Track Mounting": {
            "value": None,
            "manual_select": True,
            "options": model_data["track_mounting"],
            "placeholder": "Select track mounting",
            "required": True,
            "depends_on": None
        }
    }

    # Top seals (only for VL series)
    if model_data["top_seals"]:
        config["Top Seals"] = {
            "value": model_data["top_seals"][0] if len(model_data["top_seals"]) == 1 else None,
            "manual_select": len(model_data["top_seals"]) > 1,
            "options": model_data["top_seals"],
            "placeholder": "Select top seal" if len(model_data["top_seals"]) > 1 else None,
            "required": True,
            "depends_on": None
        }

    # Bottom seals (only for VL series)
    if model_data["bottom_seals"]:
        config["Bottom Seals"] = {
            "value": None,
            "manual_select": True,
            "options": model_data["bottom_seals"],
            "placeholder": "Select bottom seal",
            "required": True,
            "depends_on": None
        }

    config.update({
        "Options": {
            "value": None,
            "manual_select": True,
            "options": model_data["options"],
            "placeholder": "Select options (multi-select)",
            "required": False,
            "depends_on": None
        },
        "Final Closure System": {
            "value": None,
            "manual_select": True,
            "options": model_data["final_closures"],
            "placeholder": "Select final closure",
            "required": True,
            "depends_on": None
        }
    })

    return config


def main():
    """Generate complete product models JSON file"""
    models = []

    # Generate operable wall models
    for model_name, model_data in OPERABLE_MODELS.items():
        description = f"Kwik-Wall {model_data['series']} Series {model_data['panel_config']}"
        if "Hufcor" in model_name:
            description = f"Hufcor 600 Series {model_data['panel_config']}"
        if model_data.get("has_glass"):
            description += " with Glass Lights"
        if model_data.get("is_electric"):
            description += " - Electric"

        models.append({
            "name": model_name,
            "description": description,
            "product_category_code": "OPER",
            "series_code": model_data["series"],
            "default_configurations": create_operable_config(model_name, model_data)
        })

    # Generate glass wall models
    for model_name, model_data in GLASS_MODELS.items():
        models.append({
            "name": model_name,
            "description": f"Moderco {model_name} Glass Wall System",
            "product_category_code": "GLASS",
            "series_code": None,
            "default_configurations": create_glass_config(model_name, model_data)
        })

    # Generate accordion models
    for model_name, model_data in ACCORDION_MODELS.items():
        models.append({
            "name": model_name,
            "description": f"Curtition {model_data['series']} Series Accordion Partition - {model_name}",
            "product_category_code": "ACCORD",
            "series_code": model_data["series"],
            "default_configurations": create_accordion_config(model_name, model_data)
        })

    # Write to file
    output = {"product_models": models}

    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(script_dir, "..", "docs", "PRODUCT_MODELS_WITH_DEFAULT_CONFIGURATIONS.json")

    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"✅ Generated {len(models)} product models")
    print(f"   - {len(OPERABLE_MODELS)} Operable Wall models")
    print(f"   - {len(GLASS_MODELS)} Glass Wall models")
    print(f"   - {len(ACCORDION_MODELS)} Accordion Partition models")
    print(f"📄 File saved to: {output_path}")


if __name__ == "__main__":
    main()
