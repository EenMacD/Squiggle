using System.Text.Json.Serialization;

namespace RugbyTraining.Models;

public class Position
{
    public double X { get; set; }
    public double Y { get; set; }
    public long Timestamp { get; set; }
}

public class TeamMovements
{
    public Dictionary<string, List<Position>> Movements { get; set; } = new();
}

public class Play
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public Dictionary<string, Dictionary<string, List<Position>>> Movements { get; set; } = new();
}
