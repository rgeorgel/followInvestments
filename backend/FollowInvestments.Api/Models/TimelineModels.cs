namespace FollowInvestments.Api.Models;

public class InvestmentTimelineData
{
    public List<TimelinePoint> TimelinePoints { get; set; } = new();
    public List<GoalMarker> GoalMarkers { get; set; } = new();
    public decimal CurrentTotalValue { get; set; }
    public decimal CurrentBrlValue { get; set; }
    public decimal CurrentCadValue { get; set; }
}

public class TimelinePoint
{
    public DateTime Date { get; set; }
    public decimal TotalValue { get; set; }
    public decimal BrlValue { get; set; }
    public decimal CadValue { get; set; }
}

public class GoalMarker
{
    public int Year { get; set; }
    public decimal Value { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}