using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using MongoDB.Bson; 
using RugbyTraining.Models;
using System.Threading.Tasks;
using System.Collections.Generic;
// Removed: using Microsoft.Extensions.Configuration;
// Removed: using System; // If only used for InvalidOperationException related to config

namespace RugbyTraining.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PlaysController : ControllerBase
    {
        private readonly IMongoCollection<Play> _playsCollection;

        public PlaysController(IMongoCollection<Play> playsCollection)
        {
            _playsCollection = playsCollection;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Play>>> GetPlays()
        {
            var plays = await _playsCollection.Find(Builders<Play>.Filter.Empty)
                                              .SortByDescending(p => p.CreatedAt)
                                              .ToListAsync();
            return Ok(plays);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Play>> GetPlayById(string id)
        {
            if (!ObjectId.TryParse(id, out _))
            {
                return BadRequest("Invalid ID format.");
            }
            var filter = Builders<Play>.Filter.Eq(p => p.Id, id);
            var play = await _playsCollection.Find(filter).FirstOrDefaultAsync();

            if (play == null)
            {
                return NotFound();
            }
            return Ok(play);
        }

        [HttpGet("category/{category}")]
        public async Task<ActionResult<IEnumerable<Play>>> GetPlaysByCategory(string category)
        {
            var filter = Builders<Play>.Filter.Eq(p => p.Category, category);
            var plays = await _playsCollection.Find(filter)
                                              .SortByDescending(p => p.CreatedAt)
                                              .ToListAsync();
            return Ok(plays);
        }

        [HttpPost]
        public async Task<ActionResult<Play>> CreatePlay([FromBody] Play play)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            play.Id = ObjectId.GenerateNewId().ToString(); 
            play.CreatedAt = System.DateTime.UtcNow; // Explicitly use System.DateTime
            play.UpdatedAt = System.DateTime.UtcNow; // Explicitly use System.DateTime

            await _playsCollection.InsertOneAsync(play);
            return CreatedAtAction(nameof(GetPlayById), new { id = play.Id }, play);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePlay(string id)
        {
             if (!ObjectId.TryParse(id, out _))
            {
                return BadRequest("Invalid ID format.");
            }
            var filter = Builders<Play>.Filter.Eq(p => p.Id, id);
            var result = await _playsCollection.DeleteOneAsync(filter);

            if (result.DeletedCount == 0)
            {
                return NotFound();
            }
            return NoContent();
        }
    }
}
