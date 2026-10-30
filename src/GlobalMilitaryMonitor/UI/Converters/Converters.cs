using System.Globalization;
using System.Windows;
using System.Windows.Data;
using System.Windows.Media;
using GlobalMilitaryMonitor.DataIngestion.Models;

namespace GlobalMilitaryMonitor.UI.Converters;

public class BoolToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is bool b)
            return b ? Visibility.Visible : Visibility.Collapsed;
        return Visibility.Collapsed;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        return value is Visibility v && v == Visibility.Visible;
    }
}

public class InverseBoolToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is bool b)
            return b ? Visibility.Collapsed : Visibility.Visible;
        return Visibility.Visible;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        return value is Visibility v && v == Visibility.Collapsed;
    }
}

public class SeverityToColorConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is SeverityLevel severity)
        {
            var hex = severity switch
            {
                SeverityLevel.Low => "#4CAF50",
                SeverityLevel.Medium => "#FF9800",
                SeverityLevel.High => "#F44336",
                SeverityLevel.Critical => "#D50000",
                _ => "#9E9E9E"
            };
            return new SolidColorBrush((Color)ColorConverter.ConvertFromString(hex));
        }
        return new SolidColorBrush(Colors.Gray);
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}

public class CategoryToIconConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is EventCategory category)
        {
            return category switch
            {
                EventCategory.Conflict => "\u2694",
                EventCategory.MissileLaunch => "\uD83D\uDE80",
                EventCategory.MilitaryMovement => "\uD83D\uDEB6",
                EventCategory.NavalActivity => "\u2693",
                EventCategory.AirActivity => "\u2708",
                EventCategory.Diplomacy => "\uD83E\uDD1D",
                EventCategory.Sanctions => "\uD83D\uDEAB",
                EventCategory.Terrorism => "\u26A0",
                EventCategory.CyberAttack => "\uD83D\uDCBB",
                EventCategory.NuclearActivity => "\u2622",
                _ => "\u2139"
            };
        }
        return "\u2139";
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}

public class TimestampToRelativeConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is DateTime timestamp)
        {
            var diff = DateTime.UtcNow - timestamp;
            if (diff.TotalMinutes < 1) return "Just now";
            if (diff.TotalMinutes < 60) return $"{(int)diff.TotalMinutes}m ago";
            if (diff.TotalHours < 24) return $"{(int)diff.TotalHours}h ago";
            if (diff.TotalDays < 7) return $"{(int)diff.TotalDays}d ago";
            return timestamp.ToString("yyyy-MM-dd");
        }
        return "Unknown";
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}

public class NullToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        return value != null ? Visibility.Visible : Visibility.Collapsed;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}

public class SeverityToBorderConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is SeverityLevel severity)
        {
            var hex = severity switch
            {
                SeverityLevel.Low => "#4CAF5040",
                SeverityLevel.Medium => "#FF980040",
                SeverityLevel.High => "#F4433660",
                SeverityLevel.Critical => "#D5000080",
                _ => "#9E9E9E40"
            };
            return new SolidColorBrush((Color)ColorConverter.ConvertFromString(hex));
        }
        return new SolidColorBrush(Colors.Transparent);
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}
