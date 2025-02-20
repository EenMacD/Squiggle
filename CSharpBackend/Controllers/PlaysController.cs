using Microsoft.AspNetCore.Mvc;
using Npgsql;
using Dapper;
using RugbyTraining.Models;

namespace RugbyTraining.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PlaysController : ControllerBase
{
    private readonly string _connectionString;

    public PlaysController(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string not found.");
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Play>>> GetPlays()
    {
        using var connection = new NpgsqlConnection(_connectionString);
        var plays = await connection.QueryAsync<Play>("SELECT * FROM plays");
        return Ok(plays);
    }

    [HttpGet("category/{category}")]
    public async Task<ActionResult<IEnumerable<Play>>> GetPlaysByCategory(string category)
    {
        using var connection = new NpgsqlConnection(_connectionString);
        var plays = await connection.QueryAsync<Play>(
            "SELECT * FROM plays WHERE category = @Category",
            new { Category = category });
        return Ok(plays);
    }

    [HttpPost]
    public async Task<ActionResult<Play>> CreatePlay(Play play)
    {
        using var connection = new NpgsqlConnection(_connectionString);
        var id = await connection.QuerySingleAsync<int>(
            @"INSERT INTO plays (name, category, movements) 
              VALUES (@Name, @Category, @Movements::jsonb) 
              RETURNING id",
            play);
        
        play.Id = id;
        return CreatedAtAction(nameof(GetPlays), new { id }, play);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePlay(int id)
    {
        using var connection = new NpgsqlConnection(_connectionString);
        await connection.ExecuteAsync(
            "DELETE FROM plays WHERE id = @Id",
            new { Id = id });
        return NoContent();
    }
}
