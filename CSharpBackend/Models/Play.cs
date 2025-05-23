using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.Text.Json.Serialization; // For JsonPropertyName
using System.Collections.Generic; // For List and Dictionary
using System; // For DateTime

namespace RugbyTraining.Models
{
    public class Position
    {
        [JsonPropertyName("x")]
        public double X { get; set; }

        [JsonPropertyName("y")]
        public double Y { get; set; }
    }

    public class BallState
    {
        [JsonPropertyName("position")]
        public Position Position { get; set; } = new();

        [JsonPropertyName("possessionPlayerId")]
        public string? PossessionPlayerId { get; set; }
    }

    public class KeyFrame
    {
        [JsonPropertyName("timestamp")]
        public long Timestamp { get; set; }

        [JsonPropertyName("positions")]
        public Dictionary<string, Position> Positions { get; set; } = new();

        [JsonPropertyName("ball")]
        public BallState Ball { get; set; } = new();
    }

    public class Play
    {
        [BsonId] // Marks this property as the document's primary key.
        [BsonRepresentation(BsonType.ObjectId)] // Store as ObjectId in BSON, map to string in C#.
        [JsonPropertyName("id")] // Ensure API responses use "id"
        public string Id { get; set; } = string.Empty;

        [BsonElement("name")]
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [BsonElement("category")]
        [JsonPropertyName("category")]
        public string Category { get; set; } = string.Empty;

        [BsonElement("folderId")]
        [BsonRepresentation(BsonType.ObjectId)] // Store as ObjectId if it's a foreign key.
        [JsonPropertyName("folderId")]
        public string? FolderId { get; set; } // Nullable if play can be outside a folder

        [BsonElement("keyframes")]
        [JsonPropertyName("keyframes")]
        public List<KeyFrame> Keyframes { get; set; } = new();

        [BsonElement("createdAt")]
        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; }

        [BsonElement("updatedAt")]
        [JsonPropertyName("updatedAt")]
        public DateTime UpdatedAt { get; set; }
    }
}
