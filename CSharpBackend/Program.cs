using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using MongoDB.Driver; // Added for MongoDB
using RugbyTraining.Models; // Added for Play model
using Microsoft.Extensions.Configuration; // Added for IConfiguration
using System; // Added for Environment

var builder = WebApplication.CreateBuilder(args);

// Configure MongoDB Client, Database, and Collection
var configuration = builder.Configuration;
string mongoUri = Environment.GetEnvironmentVariable("MONGO_URI") 
                  ?? configuration.GetConnectionString("MongoUri") 
                  ?? "mongodb://localhost:27017"; // Ultimate fallback
string dbName = Environment.GetEnvironmentVariable("MONGO_DB_NAME") 
                ?? configuration.GetConnectionString("MongoDbName") 
                ?? "rugby_tactics"; // Ultimate fallback

if (string.IsNullOrEmpty(mongoUri)) 
{
    // Consider logging an error or throwing a more specific startup exception
    throw new InvalidOperationException("MongoDB URI is not configured. Set MONGO_URI environment variable or ConnectionStrings:MongoUri in appsettings.json.");
}
if (string.IsNullOrEmpty(dbName))
{
     throw new InvalidOperationException("MongoDB Database Name is not configured. Set MONGO_DB_NAME environment variable or ConnectionStrings:MongoDbName in appsettings.json.");
}

builder.Services.AddSingleton<IMongoClient>(sp => new MongoClient(mongoUri));
builder.Services.AddScoped<IMongoDatabase>(sp => 
{
    var client = sp.GetRequiredService<IMongoClient>();
    return client.GetDatabase(dbName);
});
builder.Services.AddScoped<IMongoCollection<Play>>(sp =>
{
    var database = sp.GetRequiredService<IMongoDatabase>();
    return database.GetCollection<Play>("plays"); // "plays" is the collection name
});

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy",
        policy =>
        {
            policy.WithOrigins("http://localhost:8080")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});
var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("CorsPolicy");
app.UseWebSockets();

// WebSocket endpoint for game state updates
app.Map("/ws", async context =>
{
    if (context.WebSockets.IsWebSocketRequest)
    {
        using var webSocket = await context.WebSockets.AcceptWebSocketAsync();
        await HandleWebSocketConnection(webSocket);
    }
    else
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
    }
});

async Task HandleWebSocketConnection(WebSocket webSocket)
{
    var buffer = new byte[1024 * 4];
    var receiveResult = await webSocket.ReceiveAsync(
        new ArraySegment<byte>(buffer), CancellationToken.None);

    while (!receiveResult.CloseStatus.HasValue)
    {
        // Broadcast received game state to all connected clients
        await webSocket.SendAsync(
            new ArraySegment<byte>(buffer, 0, receiveResult.Count),
            receiveResult.MessageType,
            receiveResult.EndOfMessage,
            CancellationToken.None);

        receiveResult = await webSocket.ReceiveAsync(
            new ArraySegment<byte>(buffer), CancellationToken.None);
    }

    await webSocket.CloseAsync(
        receiveResult.CloseStatus.Value,
        receiveResult.CloseStatusDescription,
        CancellationToken.None);
}

app.MapControllers();
app.Run("http://0.0.0.0:5001");